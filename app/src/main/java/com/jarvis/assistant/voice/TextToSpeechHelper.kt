package com.jarvis.assistant.voice

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.UUID

class TextToSpeechHelper(context: Context) {

    private var isReady = false
    private var pendingText: String? = null
    private var onDone: (() -> Unit)? = null

    private val tts: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
        isReady = status == TextToSpeech.SUCCESS
        if (isReady) {
            tts.language = Locale.ITALIAN
            pendingText?.let { speakNow(it) }
        }
    }

    init {
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) {
                onDone?.invoke()
            }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                onDone?.invoke()
            }
        })
    }

    fun speak(text: String, onFinished: (() -> Unit)? = null) {
        onDone = onFinished
        if (isReady) {
            speakNow(text)
        } else {
            pendingText = text
        }
    }

    private fun speakNow(text: String) {
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, UUID.randomUUID().toString())
    }

    fun stop() {
        tts.stop()
    }

    fun shutdown() {
        tts.stop()
        tts.shutdown()
    }
}
