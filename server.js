// Servidor Express minimalista para servir el frontend en Railway
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use(express.static(path.join(__dirname, 'dist')))

// Todas las rutas van al index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 4173
app.listen(PORT, () => console.log(`Panel corriendo en puerto ${PORT}`))
