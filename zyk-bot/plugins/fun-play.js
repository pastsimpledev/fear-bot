import { exec } from 'child_process'
import { promisify } from 'util'
import search from 'youtube-search-api'
import { unlinkSync, readFileSync, existsSync, readdirSync, mkdirSync } from 'fs'
import path from 'path'
import axios from 'axios'

const execPromise = promisify(exec)

let handler = async (m, { conn, command, args, usedPrefix }) => {
    const tmpDir = path.resolve('./tmp')
    if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true })
    }

    const cookiePath = path.resolve('./cookies.txt')
    const cookieFlag = existsSync(cookiePath) ? `--cookies "${cookiePath}"` : ''

    if (args[0] === 'audio' || args[0] === 'video') {
        let isAudio = args[0] === 'audio'
        let url = args[1]
        if (!url || !url.includes('youtu')) return m.reply('🏮 Link non valido.')

        await m.reply(`⏳ Scaricando ${isAudio ? 'audio' : 'video'}...`)
        
        let baseName = `${Date.now()}`
        let formatSelection = isAudio 
            ? '-f "bestaudio/best" --extract-audio --audio-format mp3' 
            : '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/b"'

        let cmd = [
            'yt-dlp',
            cookieFlag,
            '--js-runtime node',
            '--force-ipv4',
            '--no-check-certificate',
            '--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"',
            formatSelection,
            `-o "${tmpDir}/${baseName}.%(ext)s"`,
            `"${url}"`
        ].join(' ')

        try {
            await execPromise(cmd)
            let files = readdirSync(tmpDir)
            let found = files.find(f => f.startsWith(baseName) && !f.endsWith('.txt'))
            if (!found) throw new Error('File non trovato')
            
            let finalPath = path.join(tmpDir, found)
            let data = readFileSync(finalPath)
            
            if (isAudio) {
                await conn.sendMessage(m.chat, { 
                    audio: data, 
                    mimetype: 'audio/mpeg', 
                    fileName: `audio.mp3` 
                }, { quoted: m })
            } else {
                await conn.sendMessage(m.chat, { 
                    video: data, 
                    mimetype: 'video/mp4', 
                    caption: `> zyklon System` 
                }, { quoted: m })
            }
            unlinkSync(finalPath)
        } catch (e) {
            console.error(e)
            m.reply(`❌ Errore durante il download.`)
        }
        return
    }

    let query = args.join(' ')
    if (!query) return m.reply(`🏮 Uso: \`${usedPrefix}play [titolo]\``)

    let results = await search.GetListByKeyword(query, false, 1)
    if (!results || !results.items || results.items.length === 0) return m.reply('❌ Nessun risultato.')

    const video = results.items[0]
    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`
    let thumb = video.thumbnail?.thumbnails?.[0]?.url || ''
    if (thumb.startsWith('//')) thumb = 'https:' + thumb

    let thumbnailBuffer
    try {
        const response = await axios.get(thumb, { responseType: 'arraybuffer' })
        thumbnailBuffer = Buffer.from(response.data)
    } catch {
        thumbnailBuffer = Buffer.alloc(0)
    }

    let caption = `╭┈➤ 『 🎵 』 *YOUTUBE PLAY*\n┆  『 📌 』 \`titolo\` ─ ${video.title}\n╰┈➤ 『 📦 』 \`zyklon system\``.trim()

    const buttons = [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "🎵 AUDIO", id: `${usedPrefix}play audio ${videoUrl}` })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "🎥 VIDEO", id: `${usedPrefix}play video ${videoUrl}` })
        }
    ]

    const msg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { 
                        title: "◯  𐙚  *──  y o u t u b e  ──*",
                        hasVideoMessage: false,
                        imageMessage: {
                            url: thumb,
                            mimetype: 'image/jpeg',
                            jpegThumbnail: thumbnailBuffer
                        },
                        headerType: 4
                    },
                    body: { text: caption },
                    footer: { text: "Seleziona un formato" },
                    nativeFlowMessage: { buttons: buttons },
                    contextInfo: {
                        ...global.newsletter().contextInfo,
                        mentionedJid: [m.sender],
                        isForwarded: true
                    }
                }
            }
        }
    }

    return await conn.relayMessage(m.chat, msg, {})
}

handler.command = ['play']
export default handler