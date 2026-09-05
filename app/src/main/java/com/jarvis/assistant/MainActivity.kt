package com.jarvis.assistant

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Settings
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

class MainActivity : ComponentActivity() {

    private lateinit var prefs: SecurePrefs
    private lateinit var speechToText: SpeechToText
    private lateinit var textToSpeech: TextToSpeechHelper
    private val claudeApi = ClaudeApi()

    private var onMicPermissionResult: ((Boolean) -> Unit)? = null
    private val requestMicPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> onMicPermissionResult?.invoke(granted) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = SecurePrefs(this)
        speechToText = SpeechToText(this)
        textToSpeech = TextToSpeechHelper(this)

        setContent {
            JarvisApp(
                prefs = prefs,
                hasMicPermission = { hasMicPermission() },
                requestMicPermission = { onResult -> requestMic(onResult) },
                speechToText = speechToText,
                textToSpeech = textToSpeech,
                claudeApi = claudeApi,
                scope = { lifecycleScope }
            )
        }
    }

    private fun hasMicPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    private fun requestMic(onResult: (Boolean) -> Unit) {
        onMicPermissionResult = onResult
        requestMicPermission.launch(Manifest.permission.RECORD_AUDIO)
    }

    override fun onDestroy() {
        speechToText.stop()
        textToSpeech.shutdown()
        super.onDestroy()
    }
}

private enum class Screen { CHAT, SETTINGS }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JarvisApp(
    prefs: SecurePrefs,
    hasMicPermission: () -> Boolean,
    requestMicPermission: ((Boolean) -> Unit) -> Unit,
    speechToText: SpeechToText,
    textToSpeech: TextToSpeechHelper,
    claudeApi: ClaudeApi,
    scope: () -> kotlinx.coroutines.CoroutineScope
) {
    var screen by remember { mutableStateOf(Screen.CHAT) }
    val messages = remember { mutableStateListOf<ChatMessage>() }
    var inputText by remember { mutableStateOf("") }
    var isBusy by remember { mutableStateOf(false) }
    var statusText by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    val coroutineScope = scope()

    fun sendToClaudeAndSpeak(userText: String) {
        val apiKey = prefs.apiKey
        if (apiKey.isNullOrBlank()) {
            statusText = "Imposta prima la tua chiave API Anthropic nelle Impostazioni."
            screen = Screen.SETTINGS
            return
        }
        messages.add(ChatMessage("user", userText))
        isBusy = true
        statusText = "Claude sta pensando…"
        coroutineScope.launch {
            when (val result = claudeApi.sendMessage(apiKey, prefs.model, messages.toList())) {
                is ClaudeResult.Success -> {
                    messages.add(ChatMessage("assistant", result.reply))
                    textToSpeech.speak(result.reply)
                    statusText = null
                }
                is ClaudeResult.Failure -> {
                    statusText = "Errore: ${result.message}"
                }
            }
            isBusy = false
        }
    }

    fun startVoiceInput() {
        if (!hasMicPermission()) {
            requestMicPermission { granted ->
                if (granted) startVoiceInput()
                else statusText = "Serve il permesso del microfono per parlare con Claude."
            }
            return
        }
        statusText = "Ti ascolto…"
        speechToText.startListening(
            onSuccess = { text ->
                statusText = null
                sendToClaudeAndSpeak(text)
            },
            onFailure = { error -> statusText = error }
        )
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    MaterialTheme(colorScheme = darkColorScheme()) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Jarvis") },
                    actions = {
                        IconButton(onClick = {
                            screen = if (screen == Screen.SETTINGS) Screen.CHAT else Screen.SETTINGS
                        }) {
                            Icon(Icons.Filled.Settings, contentDescription = "Impostazioni")
                        }
                    }
                )
            }
        ) { padding ->
            Box(modifier = Modifier.padding(padding).fillMaxSize()) {
                when (screen) {
                    Screen.SETTINGS -> SettingsScreen(prefs) { screen = Screen.CHAT }
                    Screen.CHAT -> ChatScreen(
                        messages = messages,
                        listState = listState,
                        inputText = inputText,
                        onInputChange = { inputText = it },
                        onSend = {
                            if (inputText.isNotBlank()) {
                                sendToClaudeAndSpeak(inputText)
                                inputText = ""
                            }
                        },
                        onMicClick = ::startVoiceInput,
                        isBusy = isBusy,
                        statusText = statusText
                    )
                }
            }
        }
    }
}

@Composable
private fun ChatScreen(
    messages: List<ChatMessage>,
    listState: androidx.compose.foundation.lazy.LazyListState,
    inputText: String,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
    onMicClick: () -> Unit,
    isBusy: Boolean,
    statusText: String?
) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages) { message ->
                MessageBubble(message)
            }
        }

        statusText?.let {
            Text(it, modifier = Modifier.padding(vertical = 8.dp), style = MaterialTheme.typography.bodySmall)
        }

        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = inputText,
                onValueChange = onInputChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Scrivi un messaggio") },
                enabled = !isBusy
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(onClick = onSend, enabled = !isBusy) {
                Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Invia")
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = onMicClick,
            enabled = !isBusy,
            modifier = Modifier.fillMaxWidth().height(56.dp)
        ) {
            Icon(Icons.Filled.Mic, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Parla con Claude")
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    val isUser = message.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            color = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
            shape = MaterialTheme.shapes.medium,
            modifier = Modifier.padding(4.dp)
        ) {
            Text(
                text = message.content,
                modifier = Modifier.padding(12.dp),
                color = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun SettingsScreen(prefs: SecurePrefs, onDone: () -> Unit) {
    var apiKey by remember { mutableStateOf(prefs.apiKey ?: "") }
    var model by remember { mutableStateOf(prefs.model) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Impostazioni", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = apiKey,
            onValueChange = { apiKey = it },
            label = { Text("Chiave API Anthropic") },
            placeholder = { Text("sk-ant-…") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = model,
            onValueChange = { model = it },
            label = { Text("Modello") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            "Suggerimento: aggiungi la tile \"Parla con Claude\" alle Impostazioni Rapide del telefono " +
                "(tira giù la tendina, tocca la matita/modifica e trascina la tile Jarvis) per parlare con " +
                "Claude da qualunque schermata con un solo tocco.",
            style = MaterialTheme.typography.bodySmall
        )

        Spacer(modifier = Modifier.height(20.dp))

        Button(onClick = {
            prefs.apiKey = apiKey.trim()
            prefs.model = model.trim().ifBlank { SecurePrefs.DEFAULT_MODEL }
            onDone()
        }) {
            Text("Salva")
        }
    }
}
