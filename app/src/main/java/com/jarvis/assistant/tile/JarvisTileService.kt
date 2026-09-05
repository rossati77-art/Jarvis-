package com.jarvis.assistant.tile

import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import com.jarvis.assistant.VoiceActivity

/**
 * Adds "Parla con Claude" to the phone's Quick Settings panel so the user can
 * start a voice conversation with Claude from any screen with one tap.
 */
class JarvisTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.state = Tile.STATE_INACTIVE
        qsTile?.updateTile()
    }

    override fun onClick() {
        super.onClick()
        val intent = Intent(this, VoiceActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            startActivityAndCollapse(
                android.app.PendingIntent.getActivity(
                    this,
                    0,
                    intent,
                    android.app.PendingIntent.FLAG_IMMUTABLE
                )
            )
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
