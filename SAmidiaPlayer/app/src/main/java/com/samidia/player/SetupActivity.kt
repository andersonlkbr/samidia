package com.samidia.player

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class SetupActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val prefs = getSharedPreferences("SAmidiaPrefs", Context.MODE_PRIVATE)
        if (prefs.contains("serverUrl") && prefs.contains("tvId")) {
            startPlayer()
            return
        }

        setContentView(R.layout.activity_setup)

        val etServerUrl = findViewById<EditText>(R.id.etServerUrl)
        val etPin = findViewById<EditText>(R.id.etPin)
        val btnParear = findViewById<Button>(R.id.btnParear)
        val btnResetar = findViewById<TextView>(R.id.btnResetar)

        btnParear.setOnClickListener {
            val serverUrl = etServerUrl.text.toString().trim()
            val pin = etPin.text.toString().trim()

            if (serverUrl.isEmpty() || pin.isEmpty()) {
                Toast.makeText(this, "Preencha todos os campos", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            btnParear.isEnabled = false
            btnParear.text = "Aguarde..."

            thread {
                try {
                    val url = URL("$serverUrl/api/tv/parear")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true

                    val jsonParam = JSONObject()
                    jsonParam.put("pin", pin)

                    val os = OutputStreamWriter(conn.outputStream)
                    os.write(jsonParam.toString())
                    os.flush()
                    os.close()

                    val responseCode = conn.responseCode
                    if (responseCode == 200) {
                        val responseBody = conn.inputStream.bufferedReader().use { it.readText() }
                        val jsonResponse = JSONObject(responseBody)
                        val tvId = if (jsonResponse.has("id")) jsonResponse.getString("id") else jsonResponse.optString("tvId")

                        prefs.edit()
                            .putString("serverUrl", serverUrl)
                            .putString("tvId", tvId)
                            .apply()

                        runOnUiThread {
                            startPlayer()
                        }
                    } else {
                        val msg = if (responseCode == 400 || responseCode == 404) "PIN inválido ou não encontrado." else "Erro no servidor."
                        runOnUiThread {
                            Toast.makeText(this@SetupActivity, msg, Toast.LENGTH_LONG).show()
                            btnParear.isEnabled = true
                            btnParear.text = "Parear"
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    runOnUiThread {
                        Toast.makeText(this@SetupActivity, "Erro de conexão: ${e.message}", Toast.LENGTH_LONG).show()
                        btnParear.isEnabled = true
                        btnParear.text = "Parear"
                    }
                }
            }
        }

        btnResetar.setOnClickListener {
            prefs.edit().clear().apply()
            etServerUrl.setText("")
            etPin.setText("")
            Toast.makeText(this, "Configuração resetada", Toast.LENGTH_SHORT).show()
        }
    }

    private fun startPlayer() {
        startActivity(Intent(this, PlayerActivity::class.java))
        finish()
    }
}
