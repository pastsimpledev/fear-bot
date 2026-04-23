import chalk from 'chalk'
import pkg from '@realvare/baileys'
const { getContentType} = pkg

export async function antimedia(m, { conn, isAdmin, isBotAdmin }) {
    if (!m.isGroup || isAdmin || !isBotAdmin) return false

    const msg = m.message
    const mtype = getContentType(msg)

    const isImage = mtype === 'imageMessage'
    const isVideo = mtype === 'videoMessage'

    if (!isImage && !isVideo) return false

    const media = msg.imageMessage || msg.videoMessage

    if (media?.viewOnce) return false

    if (msg.viewOnceMessage || msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension) return false

    try {
        await conn.sendMessage(m.chat, { delete: m.key })

        const avviso = `@${m.sender.split('@')[0]} in questo gruppo sono ammessi solo immagini e video ad una sola visualizzazione.` 

        await conn.sendMessage(m.chat, {
            text: avviso,
            mentions: [m.sender],
            contextInfo: {
                ...(global.newsletter ? global.newsletter().contextInfo : {}),
                isForwarded: true
            }
        })
        return true
    } catch (e) {
        console.error(chalk.red('[ANTIMEDIA ERROR]:'), e)
        return false
    }
}