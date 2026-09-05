package com.jarvis.assistant.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import java.util.Locale

/**
 * Thin callback wrapper around [SpeechRecognizer] so callers don't have to
 * implement the whole [RecognitionListener] interface for a one-shot listen.
 */
class SpeechToText(private val context: Context) {

    private var recognizer: SpeechRecognizer? = null

    fun startListening(
        locale: Locale = Locale.ITALIAN,
        onSuccess: (String) -> Unit,
        onFailure: (String) -> Unit
    ) {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            onFailure("Il riconoscimento vocale non è disponibile su questo dispositivo.")
            return
        }

        stop()
        val activeRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
        recognizer = activeRecognizer

        activeRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle) {
                val matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val text = matches?.firstOrNull()
                if (text.isNullOrBlank()) {
                    onFailure("Non ho capito, riprova.")
                } else {
                    onSuccess(text)
                }
            }

            override fun onError(error: Int) {
                onFailure("Errore riconoscimento vocale (codice $error)")
            }

            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale.toLanguageTag())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
        }
        activeRecognizer.startListening(intent)
    }

    fun stop() {
        recognizer?.stopListening()
        recognizer?.destroy()
        recognizer = null
    }
}
