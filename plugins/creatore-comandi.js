import fs from 'fs'
import path from 'path'

const specialPath = path.join(process.cwd(), 'media', 'speciali.json')

function getSpecialData() {
    try { 
        return JSON.parse(fs.readFileSync(specialPath, 'utf-8')) 
    } catch (e) { 
        return { premium: [], vips: {}, cmds: { premium: [], vip: [] } } 
    }
}

function saveSpecialData(data) {
    fs.writeFileSync(specialPath, JSON.stringify(data, null, 2))
}

export default async function handler(m, { conn, args, usedPrefix, command, isOwner, isAdmin, isGroup }) {
    let data = getSpecialData()
    let who = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.text ? m.text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false
    let cmdName = args[0]?.toLowerCase()

    switch (command) {
        case 'setvip':
        case 'delvip':
            if (!isGroup) return global.dfail('group', m, conn)
            if (!isAdmin && !isOwner) return global.dfail('admin', m, conn)
            if (!who) return m.reply('Tagga o rispondi a qualcuno.')
            if (!data.vips[m.chat]) data.vips[m.chat] = []
            if (command === 'setvip') {
                if (data.vips[m.chat].includes(who)) return m.reply('Già VIP.')
                data.vips[m.chat].push(who)
                m.reply(`@${who.split('@')[0]} è ora VIP.`, null, { mentions: [who] })
            } else {
                data.vips[m.chat] = data.vips[m.chat].filter(v => v !== who)
                m.reply('VIP rimosso.')
            }
            break

        case 'setprem':
        case 'delprem':
            if (!isOwner) return global.dfail('owner', m, conn)
            if (!who) return m.reply('Tagga o rispondi a qualcuno.')
            if (command === 'setprem') {
                if (data.premium.includes(who)) return m.reply('Già Premium.')
                data.premium.push(who)
                m.reply(`@${who.split('@')[0]} è ora Premium.`, null, { mentions: [who] })
            } else {
                data.premium = data.premium.filter(p => p !== who)
                m.reply('Premium rimosso.')
            }
            break

        case 'setvipcmd':
        case 'delvipcmd':
        case 'setpremcmd':
        case 'delpremcmd':
            if (!isOwner) return global.dfail('owner', m, conn)
            if (!cmdName) return m.reply('Specifica il comando.')
            let type = command.includes('vip') ? 'vip' : 'premium'
            if (command.startsWith('set')) {
                if (!data.cmds[type].includes(cmdName)) data.cmds[type].push(cmdName)
                m.reply(`Comando ${cmdName} ora ${type}.`)
            } else {
                data.cmds[type] = data.cmds[type].filter(c => c !== cmdName)
                m.reply(`Comando ${cmdName} non è più ${type}.`)
            }
            break

        case 'listprem':
            let prems = data.premium || []
            if (prems.length === 0) return m.reply('Nessun utente Premium.')
            let txtP = `『 🌟 UTENTI PREMIUM 🌟 』\n\n`
            prems.forEach((v, i) => txtP += `${i + 1}. @${v.split('@')[0]}\n`)
            m.reply(txtP, null, { mentions: prems })
            break

        case 'listvip':
            if (!isGroup) return global.dfail('group', m, conn)
            let vips = data.vips[m.chat] || []
            if (vips.length === 0) return m.reply('Nessun VIP in questo gruppo.')
            let txtV = `『 💎 UTENTI VIP 💎 』\n\n`
            vips.forEach((v, i) => txtV += `${i + 1}. @${v.split('@')[0]}\n`)
            m.reply(txtV, null, { mentions: vips })
            break

        case 'listpremcmd':
            let pcmds = data.cmds?.premium || []
            if (pcmds.length === 0) return m.reply('Nessun comando Premium impostato.')
            m.reply(`『 📜 COMANDI PREMIUM 📜 』\n\n${pcmds.map(c => `• ${c}`).join('\n')}`)
            break

        case 'listvipcmd':
            let vcmds = data.cmds?.vip || []
            if (vcmds.length === 0) return m.reply('Nessun comando VIP impostato.')
            m.reply(`『 📜 COMANDI VIP 📜 』\n\n${vcmds.map(c => `• ${c}`).join('\n')}`)
            break
    }
    saveSpecialData(data)
}

handler.command = /^(setvip|delvip|setprem|delprem|setvipcmd|delvipcmd|setpremcmd|delpremcmd|listprem|listvip|listpremcmd|listvipcmd)$/i