import fs from 'fs'
import path from 'path'

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('it-IT')
}

let handler = async (m, { conn }) => {
    const rootDbPath = path.join(process.cwd(), 'database.json')
    const mediaPath = path.join(process.cwd(), 'media')
    
    let dbFiles = []

    if (fs.existsSync(rootDbPath)) {
        dbFiles.push({ name: 'database.json', path: rootDbPath })
    }

    if (fs.existsSync(mediaPath)) {
        const files = fs.readdirSync(mediaPath).filter(file => file.endsWith('.json'))
        for (let file of files) {
            dbFiles.push({ name: file, path: path.join(mediaPath, file) })
        }
    }

    if (dbFiles.length === 0) {
        return conn.sendMessage(m.chat, { text: '『 ❌ 』 Nessun database trovato.' }, { quoted: m })
    }

    let text = `╭┈  『 🗄️ 』 \`lista database\`\n┆\n`
    
    for (let db of dbFiles) {
        const stats = fs.statSync(db.path)
        const content = fs.readFileSync(db.path, 'utf-8')
        const lines = content.split('\n').length

        text += `┆  『 📄 』 *${db.name}*\n`
        text += `┆  ⚖️ ${formatBytes(stats.size)} • 📝 ${lines}\n`
        text += `┆\n`
    }
    
    text += `╰┈➤ 『 📦 』 \`zykbot system\``

    await conn.sendMessage(m.chat, {
        text: text,
        ...(global.newsletter ? global.newsletter() : {})
    }, { quoted: m })
}

handler.help = ['listdb']
handler.tags = ['owner']
handler.command = /^(listdb)$/i

handler.owner = true

export default handler