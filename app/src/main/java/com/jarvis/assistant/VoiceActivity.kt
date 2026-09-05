package com.jarvis.assistant

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.jarvis.assistant.data.ChatMessage
import com.jarvis.assistant.data.ClaudeApi
import com.jarvis.assistant.data.ClaudeResult
import com.jarvis.assistant.data.SecurePrefs
import com.jarvis.assistant.voice.SpeechToText
import com.jarvis.assistant.voice.TextToSpeechHelper
import kotlinx.coroutines.launch

/**
 * Launched from the Quick Settings tile: immediately listens for a voice
 * question, sends it to Claude, speaks the answer, then closes itself.
 */
class VoiceActivity : ComponentActivity() {

    private lateinit var prefs: SecurePrefs
    private lateinit var speechToText: SpeechToText
    private lateinit var textToSpeech: TextToSpeechHelper
    private val claudeApi = ClaudeApi()

    private val requestMicPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startListening() else {
            Toast.makeText(this, getString(R.string.mic_permission_needed), Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private var statusState = mutableStateOf("")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = SecurePrefs(this)
        speechToText = SpeechToText(this)
        textToSpeech = TextToSpeechHelper(this)

        if (prefs.apiKey.isNullOrBlank()) {
            Toast.makeText(this, getString(R.string.api_key_missing), Toast.LENGTH_LONG).show()
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                VoiceOverlay(statusState.value)
            }
        }

        if (hasMicPermission()) {
            startListening()
        } else {
            requestMicPermission.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun hasMicPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    private fun startListening() {
        statusState.value = getString(R.string.listening)
        speechToText.startListening(
            onSuccess = { text -> askClaude(text) },
            onFailure = { error ->
                Toast.makeText(this, error, Toast.LENGTH_SHORT).show()
                finish()
            }
        )
    }

    private fun askClaude(question: String) {
        statusState.value = getString(R.string.thinking)
        lifecycleScope.launch {
            val apiKey = prefs.apiKey
            if (apiKey.isNullOrBlank()) {
                finish()
                return@launch
            }
            when (val result = claudeApi.sendMessage(apiKey, prefs.model, listOf(ChatMessage("user", question)))) {
                is ClaudeResult.Success -> {
                    statusState.value = result.reply
                    textToSpeech.speak(result.reply) { finish() }
                }
                is ClaudeResult.Failure -> {
                    Toast.makeText(this@VoiceActivity, result.message, Toast.LENGTH_LONG).show()
                    finish()
                }
            }
        }
    }

    override fun onDestroy() {
        speechToText.stop()
        textToSpeech.shutdown()
        super.onDestroy()
    }
}

@Composable
private fun VoiceOverlay(status: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator()
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = status.ifBlank { "Jarvis" })
            }
        }
    }
}
