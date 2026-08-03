import { Scene } from "phaser";
import {
  MeshAttachment,
  RegionAttachment,
} from "@esotericsoftware/spine-phaser-v3";
import type {
  Animation,
  SpineGameObject,
  TrackEntry,
} from "@esotericsoftware/spine-phaser-v3";
import { EventBus } from "../EventBus";
import { GameEvent } from "../events";
import type { CrashStatePayload } from "../events";
import { GamePhase } from "../enums";
import {
  aimBoneTranslation,
  bonePoseAt,
  boneTrack,
  flightWindow,
  nearestPoseTime,
  retargetAnimation,
  setupBoundsWithout,
} from "../spineRetarget";
import type { BonePose } from "../spineRetarget";

/**
 * Spine-driven crash visual.
 *
 * The whole round is ONE skeleton playing three clips, so every transition is
 * Spine animation mixing — a real pose blend — instead of a swap between two
 * game objects:
 *
 *   BETTING → the throw, frozen on its opening frame (ball in hand), with a
 *             faint breathing swell so the stance is not a statue
 *   CLOSING → the throw runs. Its wind-up is ~0.65s, almost exactly the lock-in
 *             beat, so the ball leaves his hands as the multiplier starts
 *   FLYING  → at the top of the throw the juggle loop takes the ball over and
 *             it drops onto his head
 *   CRASHED → the catch plucks the ball out of the air and he holds it again
 *
 * Two things make the hand-off invisible, both set up once in `buildThrow()`:
 *
 *  1. The throw only exists in the `start` export and the juggle/catch only in
 *     `catch_ball` — and the two exports do not share a rest pose, so playing
 *     them on separate skeletons pops the whole body. `retargetAnimation`
 *     rebuilds the throw against the `catch_ball` rig so all three clips can
 *     share a skeleton; see spineRetarget.ts for the why.
 *  2. The clips were authored apart, so the throw leaves the ball about its own
 *     width from where the juggle expects to pick it up. The flight is bent to
 *     land exactly on the juggle's entry point, which leaves the mix with only
 *     the body to blend.
 *
 * Everything reacts to the same engine events the React UI does, so gameplay
 * and visuals stay in lock-step.
 */

const ASSET_BASE = "/assets/Animations";

/**
 * Every atlas here is tagged `pma:true`, but the packed WebPs are NOT actually
 * premultiplied — the fully transparent border pixels still carry colour. Left
 * on, Spine blends them with `ONE, ONE_MINUS_SRC_ALPHA`, which ADDS that colour
 * and rings every cut-out (beach ball, umbrellas, the boy) in a pale halo — the
 * transparent background showing through. Forcing straight alpha blending drops
 * the halo; Phaser has already premultiplied the texture on upload, so nothing
 * else changes.
 */
const ATLAS_PREMULTIPLIED_ALPHA = false;

/**
 * Slot in the beach skeleton holding the full-bleed photo. The umbrellas and the
 * beach ball are separate slots that stick out PAST the photo's edges, so the
 * skeleton's own bounds are ~4% wider than the artwork — see `layout()`.
 */
const BEACH_PHOTO_SLOT = "1234";

/** Named clips (Georgian): agdeba = toss-up, dachera = catch, animation = juggle. */
const THROW_ANIM = "agdeba";
const JUGGLE_ANIM = "animation";
const CATCH_ANIM = "dachera";
const BEACH_ANIM = "animation";

/**
 * Bone the ball is bound to. The ball mesh is weighted to it alone, so matching
 * this bone's local position matches the ball exactly — which is how the clips
 * are lined up with each other.
 */
const BALL_BONE = "bone31";

/** The ball's slot, hidden when measuring how tall the boy himself is. */
const BALL_SLOT = "Butii";

/**
 * The painted ground shadow. Detached at create: it reads as a hard oval on the
 * sand rather than a shadow, and it is 677 units wide against the boy's 115,
 * sitting far enough off-centre to drag the whole character sideways when the
 * skeleton's own bounds are used to place him.
 */
const SHADOW_SLOT = "miwa";

/**
 * Spine mix times (s). They only have to cover the BODY changing intent, since
 * the ball itself is pose-matched across every hand-off.
 */
const MIX = {
  throwToJuggle: 0.2,
  juggleToCatch: 0.2,
  /** A bust so early that the ball never reached the juggle. */
  throwToCatch: 0.2,
  /** Settling back into the next round's stance; the longest of the four. */
  toIdle: 0.3,
} as const;

/**
 * Fraction of the canvas height the BOY fills, feet to top of head. Measured
 * without the ball on purpose: at rest the ball floats a head and a half above
 * him, so sizing off the whole skeleton would spend a third of the budget on
 * empty air and leave him looking small.
 */
const CHAR_HEIGHT_FRACTION = 0.56;

/** Where his feet sit, as a fraction of canvas height. */
const CHAR_FEET_Y = 0.97;

/**
 * Headroom kept above the character for the ball's arc, as a multiple of the
 * setup-pose height. The juggle reaches ~1% past the setup pose; the rest is
 * margin so a bigger character crops nothing off the top of the canvas.
 */
const BALL_HEADROOM = 1.04;

/**
 * A subtle vertical "breathing" swell layered on the frozen stance so it reads
 * as alive rather than a statue. Set IDLE_BREATH_AMOUNT to 0 for a fully static
 * skeleton. IDLE_BREATH_CYCLE_SEC is one full breath in-and-out.
 */
const IDLE_BREATH_AMOUNT = 0.012; // ~1.2% vertical swell
const IDLE_BREATH_CYCLE_SEC = 2.6;

export class GameScene extends Scene {
  private beach?: SpineGameObject;
  /** Skeleton-space rect of the beach photo alone, measured from the setup pose. */
  private beachPhotoRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** The one character skeleton; every clip of the round plays on it. */
  private char?: SpineGameObject;
  /** The throw, rebuilt onto the character's rig. Undefined if the donor is missing. */
  private throwAnim?: Animation;
  /** How far into the throw the ball is at the top of its arc (s). */
  private handoffSec = 0;
  private ballBoneIndex = -1;
  /** The ball's path through the catch, for entering it on the nearest pose. */
  private catchTrack: BonePose[] = [];
  /** Setup-pose rect of the boy alone — no ball, no shadow. Sizes and centres him. */
  private bodyRect?: { x: number; y: number; width: number; height: number };
  /** Setup-pose rect of the boy plus the ball's airspace, for the scale cap. */
  private envelopeRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** Pending "ball reached the top → start juggling"; cancelled on crash. */
  private handoffTimer?: Phaser.Time.TimerEvent;
  /** Guards the throw against being started twice in one round. */
  private throwing = false;

  /** Set while the idle stance is showing; drives the breathing in `update()`. */
  private idleEntry?: TrackEntry;
  private idleElapsed = 0; // seconds since the idle started
  /** Base character scale from layout, before idle breathing is layered on. */
  private charScale = 1;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.spineBinary(
      "beach-data",
      `${ASSET_BASE}/beach_background/beach.skel`,
    );
    this.load.spineAtlas(
      "beach-atlas",
      `${ASSET_BASE}/beach_background/beach.atlas`,
      ATLAS_PREMULTIPLIED_ALPHA,
    );

    // `start` is loaded for its throw only — it never becomes a game object.
    this.load.spineBinary("start-data", `${ASSET_BASE}/start/Ronaldo.skel`);
    this.load.spineAtlas(
      "start-atlas",
      `${ASSET_BASE}/start/Ronaldo.atlas`,
      ATLAS_PREMULTIPLIED_ALPHA,
    );

    // The rig the round actually runs on: it owns the juggle and the catch.
    this.load.spineBinary(
      "catch-data",
      `${ASSET_BASE}/catch_ball/Ronaldo.skel`,
    );
    this.load.spineAtlas(
      "catch-atlas",
      `${ASSET_BASE}/catch_ball/Ronaldo.atlas`,
      ATLAS_PREMULTIPLIED_ALPHA,
    );
  }

  create() {
    // Background — always looping, behind everything. Measure the photo while
    // the skeleton is still in its setup pose, before the loop starts moving it.
    this.beach = this.add.spine(0, 0, "beach-data", "beach-atlas");
    this.beach.setDepth(-10);
    this.beachPhotoRect = this.measureSlot(this.beach, BEACH_PHOTO_SLOT);
    this.playAnim(this.beach, BEACH_ANIM, true);

    this.char = this.add.spine(0, 0, "catch-data", "catch-atlas");
    this.buildThrow();

    this.layout();
    this.scale.on("resize", this.layout, this);

    EventBus.on(GameEvent.GamePhaseChange, this.handlePhaseChange, this);
    EventBus.on(GameEvent.CrashState, this.handleCrashState, this);

    this.events.once("shutdown", this.teardown, this);
    this.events.once("destroy", this.teardown, this);

    // Start idle (boy standing, holding the ball); ask for the current phase.
    this.enterIdle();
    EventBus.emit(GameEvent.SceneReady);
    EventBus.emit(GameEvent.RequestPhaseSync);
  }

  // ── Choreography setup ───────────────────────────────────

  /**
   * Rebuilds the throw onto the character's rig, aims it at the juggle's entry
   * point, and registers the mix times. Runs once, at create.
   */
  private buildThrow() {
    const char = this.char;
    if (!char) return;

    const host = char.skeleton.data;
    const juggle = host.findAnimation(JUGGLE_ANIM);
    const caught = host.findAnimation(CATCH_ANIM);

    // Drop the painted ground shadow. No clip re-attaches it (none of the three
    // carries an attachment timeline), so clearing the slot once is enough.
    char.skeleton.findSlot(SHADOW_SLOT)?.setAttachment(null);
    this.bodyRect =
      setupBoundsWithout(host, [SHADOW_SLOT, BALL_SLOT]) ?? undefined;
    this.envelopeRect = setupBoundsWithout(host, [SHADOW_SLOT]) ?? undefined;

    this.ballBoneIndex = host.findBone(BALL_BONE)?.index ?? -1;
    if (caught && this.ballBoneIndex >= 0) {
      this.catchTrack = boneTrack(host, caught, this.ballBoneIndex);
    }

    const donor = this.spine.getSkeletonData("start-data", "start-atlas");
    const thrown = donor ? retargetAnimation(donor, host, THROW_ANIM) : null;

    if (thrown && this.ballBoneIndex >= 0) {
      const track = boneTrack(host, thrown, this.ballBoneIndex);
      const { release, apex } = flightWindow(track);
      this.handoffSec = apex.time;

      if (juggle) {
        // Bend the flight so the ball tops out exactly where the juggle takes
        // over. The correction starts at zero on the frame the ball leaves his
        // hand, so the wind-up and the release are untouched — he simply throws
        // it at his own head.
        const entryPose = bonePoseAt(host, juggle, this.ballBoneIndex, 0);
        aimBoneTranslation(
          thrown,
          this.ballBoneIndex,
          entryPose,
          apex,
          release.time,
          apex.time,
        );
      }
    }
    this.throwAnim = thrown ?? undefined;

    const { data } = char.animationState;
    if (thrown && juggle) data.setMixWith(thrown, juggle, MIX.throwToJuggle);
    if (thrown && caught) data.setMixWith(thrown, caught, MIX.throwToCatch);
    if (juggle && caught) data.setMixWith(juggle, caught, MIX.juggleToCatch);
    if (caught && thrown) data.setMixWith(caught, thrown, MIX.toIdle);
    if (juggle && thrown) data.setMixWith(juggle, thrown, MIX.toIdle);
  }

  // ── Layout ───────────────────────────────────────────────

  private layout = () => {
    const w = this.scale.width;
    const h = this.scale.height;

    if (this.beach) {
      // `updateSize()` resets the display origin to the skeleton's bounds corner,
      // so read the bounds off it before `setOrigin()` overwrites that.
      this.beach.updateSize();
      const bounds = {
        x: -this.beach.displayOriginX,
        y: -this.beach.displayOriginY,
        width: this.beach.width || w,
        height: this.beach.height || h,
      };
      // Cover on the PHOTO's rect, not the skeleton's: the umbrellas overhang it
      // on both sides, and scaling to those wider bounds leaves the photo short
      // of the canvas edges — bare background strips down the left and right on
      // wide viewports. The overhanging props simply clip at the edges.
      //
      // Horizontally centred, but anchored on the photo's BOTTOM edge, because
      // cover has to crop something and the two axes are not interchangeable:
      // the sand is the bottom of the photo and the boy stands at the bottom of
      // the canvas. Cropping evenly — the obvious choice — takes that sand away
      // on any stage wider than the photo and leaves him standing in the sea.
      // Losing sky off the top costs nothing by comparison.
      const photo = this.beachPhotoRect ?? bounds;
      this.beach.setOrigin(
        (photo.x + photo.width / 2 - bounds.x) / bounds.width,
        (photo.y + photo.height - bounds.y) / bounds.height,
      );
      this.beach.setScale(Math.max(w / photo.width, h / photo.height));
      this.beach.setPosition(w / 2, h);
    }

    if (this.char) {
      // Same read-before-setOrigin dance as the beach above.
      this.char.updateSize();
      const full = {
        x: -this.char.displayOriginX,
        y: -this.char.displayOriginY,
        width: Math.max(1, this.char.width),
        height: Math.max(1, this.char.height),
      };
      // The skeleton's own bounds are dominated by the ground shadow, which is
      // six times his width and sits off to one side — anchoring on them puts
      // him visibly left of centre and floating above his feet. Anchor on the
      // boy's own rect instead: centre on its middle, stand him on its base.
      const body = this.bodyRect ?? full;
      const envelope = this.envelopeRect ?? full;
      const wanted = (h * CHAR_HEIGHT_FRACTION) / body.height;
      // …but never so large that the ball's arc runs off the top of the canvas.
      const ceiling = (h * CHAR_FEET_Y) / (envelope.height * BALL_HEADROOM);
      this.charScale = Math.min(wanted, ceiling);
      this.char.setOrigin(
        (body.x + body.width / 2 - full.x) / full.width,
        (body.y + body.height - full.y) / full.height,
      );
      this.char.setScale(this.charScale);
      this.char.setPosition(w / 2, h * CHAR_FEET_Y);
    }
  };

  // ── Spine helpers ────────────────────────────────────────

  /**
   * World-space bounding rect of a SINGLE slot's attachment, in skeleton
   * coordinates — `updateSize()` only ever reports the whole skeleton, which is
   * too wide when a slot overhangs the artwork. Returns undefined if the slot
   * carries nothing measurable.
   */
  private measureSlot(obj: SpineGameObject, slotName: string) {
    const slot = obj.skeleton.findSlot(slotName);
    const attachment = slot?.getAttachment();
    if (!slot) return undefined;

    const verts: number[] = [];
    if (attachment instanceof MeshAttachment) {
      const count = attachment.worldVerticesLength;
      attachment.computeWorldVertices(slot, 0, count, verts, 0, 2);
    } else if (attachment instanceof RegionAttachment) {
      attachment.computeWorldVertices(slot, verts, 0, 2);
    } else {
      return undefined;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < verts.length; i += 2) {
      minX = Math.min(minX, verts[i]);
      maxX = Math.max(maxX, verts[i]);
      minY = Math.min(minY, verts[i + 1]);
      maxY = Math.max(maxY, verts[i + 1]);
    }
    if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY)
      return undefined;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /** Plays a named animation, falling back to the first clip if absent. */
  private playAnim(obj: SpineGameObject, name: string, loop: boolean) {
    const data = obj.skeleton.data;
    const anim = data.findAnimation(name) ?? data.animations[0];
    if (anim) obj.animationState.setAnimation(0, anim.name, loop);
  }

  private clearHandoff() {
    this.handoffTimer?.remove(false);
    this.handoffTimer = undefined;
  }

  // ── Character states ─────────────────────────────────────

  /**
   * Betting idle: the throw held on its opening frame — ball in hand — with
   * `update()` layering a breathing swell on top. Because the stance IS the
   * throw's first frame, starting the round needs no transition at all: the
   * clip simply begins to move.
   */
  private enterIdle() {
    this.clearHandoff();
    this.throwing = false;
    const char = this.char;
    if (!char) return;

    // Without a throw the juggle's own opening frame is the only sane stance.
    const stance =
      this.throwAnim ?? char.skeleton.data.findAnimation(JUGGLE_ANIM);
    if (!stance) return;

    const entry = char.animationState.setAnimationWith(0, stance, false);
    entry.trackTime = 0;
    entry.timeScale = 0; // frozen; the only motion is the breathing below
    this.idleEntry = entry;
    this.idleElapsed = 0;
  }

  private stopIdle() {
    if (!this.idleEntry) return;
    this.idleEntry = undefined;
    this.char?.setScale(this.charScale); // drop the breathing swell
  }

  update(_time: number, delta: number) {
    // Idle breathing: a gentle vertical swell around the held stance.
    if (!this.idleEntry || !this.char) return;
    this.idleElapsed += delta / 1000;
    const swell =
      IDLE_BREATH_AMOUNT *
      (0.5 -
        0.5 *
          Math.cos((2 * Math.PI * this.idleElapsed) / IDLE_BREATH_CYCLE_SEC));
    // Origin is at the feet, so scaling Y makes the torso rise/fall while the
    // feet stay planted; a slight X counter keeps the volume natural.
    this.char.setScale(
      this.charScale * (1 - swell * 0.5),
      this.charScale * (1 + swell),
    );
  }

  /**
   * Unfreezes the throw and schedules the hand-off for the top of its arc.
   * Called on the lock-in beat and again when the round flies, so whichever
   * arrives first starts it and the second call is a no-op.
   */
  private startThrow() {
    if (this.throwing) return;
    const char = this.char;
    if (!char) return;
    this.throwing = true;

    if (!this.throwAnim) {
      this.enterJuggle(); // no throw to play; go straight to juggling
      return;
    }

    const held = this.idleEntry;
    this.stopIdle();
    // The idle is this very clip parked on frame 0 — reuse that entry so there
    // is no re-entry to blend, it just starts moving.
    const entry =
      held?.animation === this.throwAnim
        ? held
        : char.animationState.setAnimationWith(0, this.throwAnim, false);
    entry.timeScale = 1;

    const remaining = Math.max(0, this.handoffSec - entry.trackTime);
    this.handoffTimer = this.time.delayedCall(remaining * 1000, () =>
      this.enterJuggle(),
    );
  }

  /** The ball tops out and the juggle loop takes it over. */
  private enterJuggle() {
    this.clearHandoff();
    this.stopIdle();
    const char = this.char;
    const juggle = char?.skeleton.data.findAnimation(JUGGLE_ANIM);
    if (!char || !juggle) return;
    char.animationState.setAnimationWith(0, juggle, true);
  }

  /** Crash: he catches the ball out of wherever it happens to be. */
  private enterCatch() {
    this.clearHandoff();
    this.stopIdle();
    this.throwing = false;
    const char = this.char;
    const caught = char?.skeleton.data.findAnimation(CATCH_ANIM);
    if (!char || !caught) return;

    const entry = char.animationState.setAnimationWith(0, caught, false);
    // The crash lands wherever the ball is in the juggle, but the catch clip
    // always opens at the top of its arc. Entering on the frame whose ball sits
    // closest to the live one keeps it falling instead of snapping back up.
    if (this.ballBoneIndex >= 0 && this.catchTrack.length > 0) {
      entry.trackTime = nearestPoseTime(
        this.catchTrack,
        char.skeleton.bones[this.ballBoneIndex],
      );
    }
  }

  // ── Event handlers ───────────────────────────────────────

  private handlePhaseChange(phase: GamePhase) {
    switch (phase) {
      case GamePhase.BettingOpen:
        this.enterIdle();
        break;
      case GamePhase.BettingClosing:
        // Spend the lock-in beat on the wind-up, so the ball is already in the
        // air by the time the multiplier starts climbing.
        this.startThrow();
        break;
      case GamePhase.Flying:
        this.startThrow(); // no-op when the lock-in already started it
        break;
      case GamePhase.Crashed:
        this.enterCatch();
        break;
      default:
        break;
    }
  }

  private handleCrashState(payload: CrashStatePayload) {
    if (!payload.crashed) return;
    this.cameras.main.flash(200, 226, 43, 46);
  }

  private teardown() {
    this.clearHandoff();
    this.scale.off("resize", this.layout, this);
    EventBus.off(GameEvent.GamePhaseChange, this.handlePhaseChange, this);
    EventBus.off(GameEvent.CrashState, this.handleCrashState, this);
  }
}
