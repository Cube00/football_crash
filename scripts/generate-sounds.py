"""Procedurally synthesise two placeholder sounds for the crash game.

  juggle.webm  — a football meeting a forehead: soft slap + low thump + a
                 short skin resonance.
  ambient.webm — a seamless beach bed: surf swells, foam, a couple of gulls.

Everything is built from noise and sine partials with shaped envelopes; no
samples are used. Output is 48kHz mono WAV, encoded to Opus-in-WebM afterwards.
"""
import numpy as np
import wave

SR = 48_000


def write_wav(path, mono, peak=0.9):
    x = np.asarray(mono, dtype=np.float64)
    x = x / max(1e-9, np.max(np.abs(x))) * peak
    pcm = np.clip(x * 32767, -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    return len(x) / SR


def spectral_shape(noise, tilt=1.0, lo=None, hi=None, emphasis=None):
    """Shape white noise in the frequency domain: 1/f**tilt, band limits, and
    an optional (centre, width, gain) bump."""
    spec = np.fft.rfft(noise)
    freqs = np.fft.rfftfreq(len(noise), 1 / SR)
    gain = np.ones_like(freqs)
    with np.errstate(divide="ignore"):
        gain[1:] = 1.0 / np.power(freqs[1:], tilt)
    gain[0] = 0.0
    if lo:
        gain *= 1 / (1 + (lo / np.maximum(freqs, 1e-6)) ** 4)   # high-pass
    if hi:
        gain *= 1 / (1 + (freqs / hi) ** 4)                      # low-pass
    if emphasis:
        centre, width, amount = emphasis
        gain *= 1 + amount * np.exp(-0.5 * ((freqs - centre) / width) ** 2)
    out = np.fft.irfft(spec * gain, n=len(noise))
    # A 1/f tilt drops the level by orders of magnitude; without this every
    # mix gain below would be meaningless and the loudest layer would win.
    return out / max(1e-12, np.sqrt(np.mean(out ** 2)))


# ── the ball meeting his head ────────────────────────────────────────────
def juggle(rng):
    dur = 0.20
    t = np.arange(int(dur * SR)) / SR

    # Body: a drum-like thump whose pitch drops as it decays.
    pitch = 150 * np.exp(-t / 0.035) + 62
    body = np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-t / 0.045)

    # The hollow ring of an inflated ball. Two partials, and louder than the
    # body wants to be: phone and laptop speakers roll off below ~200Hz, so a
    # thump that lives only down there simply is not there on most devices.
    skin = 0.50 * np.sin(2 * np.pi * 430 * t) * np.exp(-t / 0.026)
    skin += 0.30 * np.sin(2 * np.pi * 720 * t) * np.exp(-t / 0.018)

    # The slap of contact: a few ms of bright noise.
    slap = spectral_shape(rng.standard_normal(len(t)), tilt=0.2, lo=1200, hi=8000)
    slap *= np.exp(-t / 0.010) * 0.70

    # A little mid noise under the body gives the leather some grain.
    grain = spectral_shape(rng.standard_normal(len(t)), tilt=0.6, lo=300, hi=2000)
    grain *= np.exp(-t / 0.030) * 0.38

    mix = 0.55 * body + skin + slap + grain
    mix *= np.minimum(1.0, t / 0.0008)          # avoid a click at sample 0
    return mix


# ── beach bed, built to loop ─────────────────────────────────────────────
def ambient(rng, dur=16.0, cross=1.2):
    n = int(dur * SR)
    nc = int(cross * SR)
    t = np.arange(n + nc) / SR

    # Surf: brown-ish noise with the body of moving water.
    surf = spectral_shape(
        rng.standard_normal(n + nc), tilt=1.15, lo=90, hi=3200,
        emphasis=(300, 260, 1.4),
    )
    # Foam: the bright hiss riding on top of each wave.
    foam = spectral_shape(
        rng.standard_normal(n + nc), tilt=0.55, lo=2200, hi=11000,
    )

    # Wave swells. Integer cycle counts over `dur` so the LFOs meet the loop
    # point exactly; the power curve gives a wash that rises then drains.
    swell = np.zeros_like(t)
    foam_env = np.zeros_like(t)
    for cycles, level, skew in ((2, 1.0, 2.2), (3, 0.62, 3.0), (5, 0.4, 4.0)):
        phase = 2 * np.pi * cycles * t / dur
        wave = (0.5 - 0.5 * np.cos(phase)) ** skew
        swell += level * wave
        # Foam lags the swell slightly and is sharper — it breaks, then fizzes.
        foam_env += level * np.roll(wave, int(0.28 * SR)) ** 1.9
    swell /= np.max(swell)
    foam_env /= np.max(foam_env)

    bed = surf * (0.34 + 0.66 * swell) + 0.30 * foam * foam_env

    # Gulls: two calls, each a handful of descending cries with vibrato.
    def gull(at, cries, base):
        for k in range(cries):
            start = at + k * 0.26
            i0 = int(start * SR)
            ln = int(0.17 * SR)
            if i0 + ln > len(bed):
                return
            tt = np.arange(ln) / SR
            f = base * (1.0 - 0.35 * tt / 0.17) * (1 + 0.06 * np.sin(2 * np.pi * 22 * tt))
            env = np.sin(np.pi * np.clip(tt / 0.17, 0, 1)) ** 1.5
            cry = np.sin(2 * np.pi * np.cumsum(f) / SR) * env
            cry += 0.30 * np.sin(4 * np.pi * np.cumsum(f) / SR) * env  # second partial
            bed[i0:i0 + ln] += 0.55 * cry * (0.85 + 0.3 * rng.random())

    gull(3.1, 3, 1750)
    gull(9.7, 2, 1520)

    # Loop seam: blend the run-on tail across the head so the ends meet.
    out = bed[:n].copy()
    fade = np.linspace(0, 1, nc)
    out[:nc] = out[:nc] * fade + bed[n:n + nc] * (1 - fade)
    return out


rng = np.random.default_rng(7)
print("juggle.wav ", round(write_wav("juggle.wav", juggle(rng), peak=0.80), 3), "s")
print("ambient.wav", round(write_wav("ambient.wav", ambient(rng), peak=0.52), 3), "s")
