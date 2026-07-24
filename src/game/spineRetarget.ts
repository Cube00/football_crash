import {
  Animation,
  MixBlend,
  MixDirection,
  Physics,
  RotateTimeline,
  ScaleTimeline,
  ShearTimeline,
  Skeleton,
  TranslateTimeline,
  TranslateXTimeline,
  TranslateYTimeline,
} from "@esotericsoftware/spine-phaser-v3";
import type {
  BoneData,
  SkeletonData,
  Timeline,
} from "@esotericsoftware/spine-phaser-v3";

/**
 * Moving a clip between two exports of the same rig.
 *
 * The three Ronaldo skeletons (`start`, `juggle_ball`, `catch_ball`) are the
 * same character exported three times: identical bones in identical order,
 * identical slots, identical skin. Only the animations differ — and the throw
 * exists solely in `start`, while the juggle and the catch exist solely in
 * `catch_ball`. Playing them on two separate skeletons is what makes the
 * hand-off read as two clips colliding, because the exports do NOT share a
 * setup pose: eleven bones sit at different rest angles and offsets, so the
 * same animated values land in different places on screen.
 *
 * Spine stores animation values relative to the setup pose, so a clip can be
 * replayed on another export of the rig by re-expressing every value against
 * that export's rest pose. This module does exactly that, which lets the whole
 * round run on ONE skeleton — and once it is one skeleton, the transitions are
 * ordinary Spine animation mixing rather than a cut between two game objects.
 *
 * The rebuild resamples rather than editing the source curves in place: Spine
 * keeps bezier control points in absolute value space alongside the keyframes,
 * so shifting keys without shifting their curve data corrupts every
 * interpolated frame between them. Resampling at a fixed rate sidesteps the
 * curve data entirely and is exact at every sample.
 */

/** A bone's local position over time, sampled at a fixed rate. */
export interface BonePose {
  time: number;
  x: number;
  y: number;
}

/** How each supported bone timeline reads from a posed bone and rebuilds. */
const BONE_TIMELINES = {
  RotateTimeline: {
    Ctor: RotateTimeline,
    read: (b: PosedBone) => [b.rotation],
    rest: (d: BoneData) => [d.rotation],
    multiplicative: false,
  },
  TranslateTimeline: {
    Ctor: TranslateTimeline,
    read: (b: PosedBone) => [b.x, b.y],
    rest: (d: BoneData) => [d.x, d.y],
    multiplicative: false,
  },
  TranslateXTimeline: {
    Ctor: TranslateXTimeline,
    read: (b: PosedBone) => [b.x],
    rest: (d: BoneData) => [d.x],
    multiplicative: false,
  },
  TranslateYTimeline: {
    Ctor: TranslateYTimeline,
    read: (b: PosedBone) => [b.y],
    rest: (d: BoneData) => [d.y],
    multiplicative: false,
  },
  ScaleTimeline: {
    Ctor: ScaleTimeline,
    read: (b: PosedBone) => [b.scaleX, b.scaleY],
    rest: (d: BoneData) => [d.scaleX, d.scaleY],
    /** Scale timelines store factors of the setup scale, not offsets. */
    multiplicative: true,
  },
  ShearTimeline: {
    Ctor: ShearTimeline,
    read: (b: PosedBone) => [b.shearX, b.shearY],
    rest: (d: BoneData) => [d.shearX, d.shearY],
    multiplicative: false,
  },
} as const;

type PosedBone = {
  rotation: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  shearX: number;
  shearY: number;
};

type BoneTimeline = Timeline & { boneIndex: number };

const isBoneTimeline = (t: Timeline): t is BoneTimeline =>
  typeof (t as BoneTimeline).boneIndex === "number";

/** Applies `anim` at `time` to a scratch skeleton and reads the local pose. */
const poseAt = (skeleton: Skeleton, anim: Animation, time: number) => {
  skeleton.setToSetupPose();
  anim.apply(
    skeleton,
    time,
    time,
    false,
    [],
    1,
    MixBlend.setup,
    MixDirection.mixIn,
  );
};

/**
 * Rebuilds `name` from `donor` so that it poses `host`'s rig identically.
 *
 * Bones the clip does not animate are deliberately left at the host's rest
 * pose rather than the donor's — that is what makes the result blend with the
 * host's own clips instead of fighting them.
 *
 * Returns null if the donor has no such animation. Timelines that are not
 * bone timelines (deform, draw order, events) are carried over untouched,
 * which is safe only because the exports share slots and skin.
 */
export function retargetAnimation(
  donor: SkeletonData,
  host: SkeletonData,
  name: string,
  fps = 60,
): Animation | null {
  const source = donor.findAnimation(name);
  if (!source || donor.bones.length !== host.bones.length) return null;

  const frameCount = Math.max(2, Math.ceil(source.duration * fps) + 1);
  const step = source.duration / (frameCount - 1);

  // Sample the donor's local pose per frame. Read straight after `apply` and
  // before any world update, so IK and physics — which the host re-solves on
  // its own identical constraints — are not baked in.
  const scratch = new Skeleton(donor);
  const samples: PosedBone[][] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    poseAt(scratch, source, frame * step);
    samples.push(
      scratch.bones.map((b) => ({
        rotation: b.rotation,
        x: b.x,
        y: b.y,
        scaleX: b.scaleX,
        scaleY: b.scaleY,
        shearX: b.shearX,
        shearY: b.shearY,
      })),
    );
  }

  const timelines = source.timelines.map((timeline) => {
    const spec =
      BONE_TIMELINES[timeline.constructor.name as keyof typeof BONE_TIMELINES];
    if (!spec || !isBoneTimeline(timeline)) return timeline;

    const { boneIndex } = timeline;
    const rest = spec.rest(host.bones[boneIndex]);
    // bezierCount 0 → every frame interpolates linearly, which at `fps` is
    // indistinguishable from the hand-keyed curves it replaces.
    const rebuilt = new spec.Ctor(frameCount, 0, boneIndex);
    for (let frame = 0; frame < frameCount; frame++) {
      const local = spec.read(samples[frame][boneIndex]);
      const values = local.map((value, i) =>
        spec.multiplicative ? value / rest[i] : value - rest[i],
      );
      // Ctor picks the arity; both signatures are (frame, time, ...values).
      (rebuilt.setFrame as (f: number, t: number, ...v: number[]) => void)(
        frame,
        frame * step,
        ...values,
      );
    }
    return rebuilt;
  });

  return new Animation(name, timelines, source.duration);
}

/**
 * Setup-pose bounds with the given slots hidden.
 *
 * The character's own bounds are useless for framing him: the ground shadow is
 * 677 units wide against his 115 and sits well off to one side, and the ball
 * rests high above his head. Measuring without them gives the rect you actually
 * want to centre and scale on.
 */
export function setupBoundsWithout(data: SkeletonData, slotNames: string[]) {
  const skeleton = new Skeleton(data);
  skeleton.setToSetupPose();
  for (const name of slotNames) skeleton.findSlot(name)?.setAttachment(null);
  skeleton.updateWorldTransform(Physics.update);
  const bounds = skeleton.getBoundsRect();
  return bounds.width > 0 && bounds.height > 0 ? bounds : null;
}

/** A bone's local position at one instant of `anim`. */
export function bonePoseAt(
  data: SkeletonData,
  anim: Animation,
  boneIndex: number,
  time: number,
): BonePose {
  const skeleton = new Skeleton(data);
  poseAt(skeleton, anim, time);
  const bone = skeleton.bones[boneIndex];
  return { time, x: bone.x, y: bone.y };
}

/** Samples a bone's local position across the whole of `anim`. */
export function boneTrack(
  data: SkeletonData,
  anim: Animation,
  boneIndex: number,
  fps = 60,
): BonePose[] {
  const skeleton = new Skeleton(data);
  const frameCount = Math.max(2, Math.ceil(anim.duration * fps) + 1);
  const step = anim.duration / (frameCount - 1);
  const track: BonePose[] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const time = frame * step;
    poseAt(skeleton, anim, time);
    const bone = skeleton.bones[boneIndex];
    track.push({ time, x: bone.x, y: bone.y });
  }
  return track;
}

const distance = (a: BonePose, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The ballistic window of a thrown-object track: `apex` is where the bone ends
 * up farthest from where it started, and `release` is where the last unbroken
 * run towards that apex begins — i.e. the frame the ball leaves the hand.
 *
 * Both are found by distance, so neither depends on which way is up (the Phaser
 * plugin flips the skeleton's Y axis, the editor does not).
 */
export function flightWindow(track: BonePose[]): {
  release: BonePose;
  apex: BonePose;
} {
  if (track.length < 2) {
    const zero = { time: 0, x: 0, y: 0 };
    return { release: track[0] ?? zero, apex: track[0] ?? zero };
  }

  let apexIndex = 0;
  let apexDistance = -1;
  for (let i = 0; i < track.length; i++) {
    const d = distance(track[i], track[0]);
    if (d > apexDistance) {
      apexDistance = d;
      apexIndex = i;
    }
  }

  // Walk back while the bone is still closing on the apex; the frame where
  // that stops is the throw itself starting.
  let releaseIndex = apexIndex;
  while (
    releaseIndex > 0 &&
    distance(track[releaseIndex - 1], track[apexIndex]) >
      distance(track[releaseIndex], track[apexIndex])
  ) {
    releaseIndex--;
  }

  return { release: track[releaseIndex], apex: track[apexIndex] };
}

/**
 * Bends a bone's translation so that instead of arriving at `arrival` it
 * arrives at `target`, easing the correction in from zero at `from`. Used to
 * aim the throw at the exact point the next clip expects the ball, leaving the
 * wind-up and the moment of release untouched.
 *
 * Returns false if the animation has no translation for that bone.
 */
export function aimBoneTranslation(
  anim: Animation,
  boneIndex: number,
  target: { x: number; y: number },
  arrival: { x: number; y: number },
  from: number,
  to: number,
): boolean {
  const timeline = anim.timelines.find(
    (t): t is TranslateTimeline =>
      t instanceof TranslateTimeline &&
      isBoneTimeline(t) &&
      t.boneIndex === boneIndex,
  );
  if (!timeline || to <= from) return false;

  const dx = target.x - arrival.x;
  const dy = target.y - arrival.y;
  const { frames } = timeline;
  const entries = timeline.getFrameEntries();
  for (let i = 0; i < frames.length; i += entries) {
    const time = frames[i];
    const u = Math.min(1, Math.max(0, (time - from) / (to - from)));
    const ease = u * u * (3 - 2 * u); // smoothstep: no kink at either end
    frames[i + 1] += dx * ease;
    frames[i + 2] += dy * ease;
  }
  return true;
}

/** Time in `track` whose pose sits closest to `local`. */
export function nearestPoseTime(
  track: BonePose[],
  local: { x: number; y: number },
): number {
  let best = 0;
  let bestDistance = Infinity;
  for (const pose of track) {
    const d = distance(pose, local);
    if (d < bestDistance) {
      bestDistance = d;
      best = pose.time;
    }
  }
  return best;
}
