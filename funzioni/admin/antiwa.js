import fetch from 'node-fetch'
import FormData from 'form-data'
import { downloadContentFromMessage } from '@realvare/baileys'

let linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z][\s\u200b\u200c\u200d\uFEFF]?){20,}/i
let urlRegex = /(https?:\/\/[^\s]+)/g

function extractAllText(message) {
    if (!message) return { text: '', urls: [] }

    let parts = []
    const msg = message

    const plain =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        msg.documentWithCaptionMessage?.message?.documentMessage?.caption ||
        msg.buttonsMessage?.contentText ||
        msg.listMessage?.description ||
        msg.templateMessage?.hydratedTemplate?.hydratedContentText ||
        msg.interactiveMessage?.body?.text ||
        ''
    if (plain) parts.push(plain)

    if (msg.pollCreationMessage) {
        const p = msg.pollCreationMessage
        if (p.name) parts.push(p.name)
        ;(p.options || []).forEach(o => { if (o.optionName) parts.push(o.optionName) })
    }

    if (msg.pollCreationMessageV2) {
        const p = msg.pollCreationMessageV2
        if (p.name) parts.push(p.name)
        ;(p.options || []).forEach(o => { if (o.optionName) parts.push(o.optionName) })
    }

    if (msg.pollCreationMessageV3) {
        const p = msg.pollCreationMessageV3
        if (p.name) parts.push(p.name)
        ;(p.options || []).forEach(o => { if (o.optionName) parts.push(o.optionName) })
    }

    if (msg.eventMessage) {
        const ev = msg.eventMessage
        if (ev.name) parts.push(ev.name)
        if (ev.description) parts.push(ev.description)
        if (ev.location?.name) parts.push(ev.location.name)
        if (ev.location?.address) parts.push(ev.location.address)
    }

    if (msg.contactMessage) {
        if (msg.contactMessage.displayName) parts.push(msg.contactMessage.displayName)
        if (msg.contactMessage.vcard) parts.push(msg.contactMessage.vcard)
    }

    if (msg.contactsArrayMessage) {
        ;(msg.contactsArrayMessage.contacts || []).forEach(c => {
            if (c.displayName) parts.push(c.displayName)
            if (c.vcard) parts.push(c.vcard)
        })
    }

    if (msg.listMessage) {
        const l = msg.listMessage
        if (l.title) parts.push(l.title)
        if (l.description) parts.push(l.description)
        if (l.footerText) parts.push(l.footerText)
        ;(l.sections || []).forEach(sec => {
            if (sec.title) parts.push(sec.title)
            ;(sec.rows || []).forEach(row => {
                if (row.title) parts.push(row.title)
                if (row.description) parts.push(row.description)
            })
        })
    }

    if (msg.buttonsMessage) {
        const b = msg.buttonsMessage
        if (b.contentText) parts.push(b.contentText)
        if (b.footerText) parts.push(b.footerText)
        ;(b.buttons || []).forEach(btn => {
            if (btn.buttonText?.displayText) parts.push(btn.buttonText.displayText)
        })
    }

    if (msg.templateMessage) {
        const tpl = msg.templateMessage?.hydratedTemplate || {}
        if (tpl.hydratedContentText) parts.push(tpl.hydratedContentText)
        if (tpl.hydratedFooterText) parts.push(tpl.hydratedFooterText)
        ;(tpl.hydratedButtons || []).forEach(b => {
            if (b.urlButton?.displayText) parts.push(b.urlButton.displayText)
            if (b.urlButton?.url) parts.push(b.urlButton.url)
            if (b.callButton?.displayText) parts.push(b.callButton.displayText)
        })
    }

    if (msg.reactionMessage?.text) parts.push(msg.reactionMessage.text)

    const fullText = parts.join(' ').trim()
    const urls = [...new Set(fullText.match(urlRegex) || [])]

    return { text: fullText, urls }
}

async function getMediaBuffer(message) {
    const msg = message?.message
    if (!msg) return null

    const mediaTypes = [
        { key: 'imageMessage', type: 'image' },
        { key: 'stickerMessage', type: 'sticker' },
        { key: 'videoMessage', type: 'video' },
    ]

    for (const { key, type } of mediaTypes) {
        if (msg[key]) {
            try {
                const stream = await downloadContentFromMessage(msg[key], type)
                let buffer = Buffer.from([])
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
                return buffer
            } catch (e) {
                return null
            }
        }
    }

    return null
}

async function readQRCode(imageBuffer) {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const formData = new FormData()
        formData.append('apikey', global.APIKeys.ocr)
        formData.append('file', imageBuffer, 'image.jpg')

        const response = await fetch(global.api_qr_read, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        })

        clearTimeout(timeout)
        const data = await response.json()

        if (data?.ParsedResults?.length > 0) {
            return data.ParsedResults[0].ParsedText || null
        }
        return null
    } catch (e) {
        return null
    }
}

export async function antiwa(m, { conn, isAdmin, isBotAdmin }) {
    if (m.isBaileys && m.fromMe) return false
    if (!m.isGroup) return false

    let chat = global.db.data.groups?.[m.chat] || global.db.data.chats?.[m.chat] || {}
    let delet = m.key.participant
    let bang = m.key.id
    const user = '@' + m.sender.split('@')[0]

    let botId = conn.decodeJid ? conn.decodeJid(conn.user.id) : conn.user.id.split(':')[0] + '@s.whatsapp.net'
    let bot = global.db.data.settings[botId] || {}

    const { text: messageText, urls: extractedUrls } = extractAllText(m.message || {})
    const cleanedText = messageText.replace(/[\u200b\u200c\u200d\uFEFF]/g, '')
    const grupoPrefix = 'https://chat.whatsapp.com'

    let containsGroupLink = !!linkRegex.exec(cleanedText) || extractedUrls.some(url => linkRegex.exec(url))
    let qrLinkDetected = false

    if (!containsGroupLink) {
        const media = await getMediaBuffer(m)
        if (media) {
            const qrData = await readQRCode(media)
            const qrText = qrData?.replace(/[\s\u200b\u200c\u200d\uFEFF]+/g, '') ?? ''
            if (qrText && linkRegex.test(qrText)) {
                containsGroupLink = true
                qrLinkDetected = true
            }
        }
    }

    if (!containsGroupLink && m.message?.documentMessage) {
        const document = m.message.documentMessage
        const allowedExts = ['.js', '.txt', '.json']
        const fileName = document.fileName || ''
        if (allowedExts.some(ext => fileName.endsWith(ext))) {
            try {
                const stream = await downloadContentFromMessage(document, 'document')
                let buffer = Buffer.from([])
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
                const cleaned = buffer.toString().replace(/[\u200b\u200c\u200d\uFEFF]/g, '')
                if (linkRegex.test(cleaned) || urlRegex.test(cleaned)) containsGroupLink = true
            } catch (err) {}
        }
    }

    if (isAdmin && chat.antiwhatsapp && (cleanedText.includes(grupoPrefix) || containsGroupLink)) return false

    if (chat.antiwhatsapp && containsGroupLink && !isAdmin) {
        if (isBotAdmin) {
            try {
                const linkThisGroup = 'https://chat.whatsapp.com/' + (await conn.groupInviteCode(m.chat))
                if (cleanedText.includes(linkThisGroup) || extractedUrls.includes(linkThisGroup)) return false
            } catch (e) {}
        }

        if (!isBotAdmin) {
            await conn.sendMessage(m.chat, { text: '*`𐔌🤖 ꒱` Devo essere admin per eliminare i link.*', ...global.newsletter() }, { quoted: m })
            return false
        }

        await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet } })

        await conn.sendMessage(m.chat, {
            text: '🚫 *ANTI-WHATSAPP*\n\n' + user + ' è stato rimosso per aver inviato un link di un gruppo/canale WhatsApp' + (qrLinkDetected ? ' *(tramite QR Code)*' : '') + '.',
            mentions: [m.sender],
            ...global.newsletter()
        })

        let responseb = await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
        if (responseb[0]?.status === '404') return true

        return true
    }

    return false
}