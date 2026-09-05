package com.jarvis.assistant.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class ChatMessage(val role: String, val content: String)

sealed class ClaudeResult {
    data class Success(val reply: String) : ClaudeResult()
    data class Failure(val message: String) : ClaudeResult()
}

/**
 * Minimal client for the Anthropic Messages API, called directly from the
 * device with the user's own API key (this is a personal, single-user app).
 */
class ClaudeApi {

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    suspend fun sendMessage(
        apiKey: String,
        model: String,
        history: List<ChatMessage>
    ): ClaudeResult = withContext(Dispatchers.IO) {
        try {
            val messages = JSONArray()
            for (m in history) {
                messages.put(
                    JSONObject()
                        .put("role", m.role)
                        .put("content", m.content)
                )
            }

            val body = JSONObject()
                .put("model", model)
                .put("max_tokens", 1024)
                .put("messages", messages)
                .toString()

            val request = Request.Builder()
                .url("https://api.anthropic.com/v1/messages")
                .addHeader("x-api-key", apiKey)
                .addHeader("anthropic-version", "2023-06-01")
                .addHeader("content-type", "application/json")
                .post(body.toRequestBody("application/json".toMediaType()))
                .build()

            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val errorMessage = runCatching {
                        JSONObject(responseBody).getJSONObject("error").getString("message")
                    }.getOrDefault("HTTP ${response.code}")
                    return@withContext ClaudeResult.Failure(errorMessage)
                }

                val json = JSONObject(responseBody)
                val content = json.getJSONArray("content")
                val text = StringBuilder()
                for (i in 0 until content.length()) {
                    val block = content.getJSONObject(i)
                    if (block.optString("type") == "text") {
                        text.append(block.optString("text"))
                    }
                }
                ClaudeResult.Success(text.toString())
            }
        } catch (e: IOException) {
            ClaudeResult.Failure(e.message ?: "Errore di rete")
        } catch (e: Exception) {
            ClaudeResult.Failure(e.message ?: "Errore sconosciuto")
        }
    }
}
