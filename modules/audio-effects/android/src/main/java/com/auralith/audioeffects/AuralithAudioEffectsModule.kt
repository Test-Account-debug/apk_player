package com.auralith.audioeffects

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.abs
import kotlin.math.roundToInt

class AuralithAudioEffectsModule : Module() {
  private var equalizer: Equalizer? = null
  private var bassBoost: BassBoost? = null

  override fun definition() = ModuleDefinition {
    Name("AuralithAudioEffects")

    AsyncFunction("attach") { audioSessionId: Int ->
      releaseEffects()
      equalizer = Equalizer(0, audioSessionId).apply { enabled = true }
      bassBoost = BassBoost(0, audioSessionId).apply { enabled = false }
    }

    Function("setBandLevel") { requestedBand: Int, levelDb: Double ->
      val effect = equalizer ?: throw IllegalStateException("No audio session attached")
      val bandCount = effect.numberOfBands.toInt()
      require(requestedBand in targetFrequencies.indices)
      val target = targetFrequencies[requestedBand]
      val actualBand = (0 until bandCount).minByOrNull { band ->
        abs(effect.getCenterFreq(band.toShort()).toLong() - target)
      } ?: throw IllegalStateException("The device exposes no equalizer bands")
      val range = effect.bandLevelRange
      val level = (levelDb * 100).roundToInt()
        .coerceIn(range[0].toInt(), range[1].toInt())
        .toShort()
      effect.setBandLevel(actualBand.toShort(), level)
    }

    Function("setBassBoost") { enabled: Boolean, strength: Int ->
      val effect = bassBoost ?: throw IllegalStateException("No audio session attached")
      effect.setStrength(strength.coerceIn(0, 1000).toShort())
      effect.enabled = enabled
    }

    Function("release") { releaseEffects() }

    OnDestroy { releaseEffects() }
  }

  private fun releaseEffects() {
    equalizer?.run {
      enabled = false
      release()
    }
    bassBoost?.run {
      enabled = false
      release()
    }
    equalizer = null
    bassBoost = null
  }

  private companion object {
    val targetFrequencies = longArrayOf(60_000, 230_000, 910_000, 4_000_000, 14_000_000)
  }
}