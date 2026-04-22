import chalk from 'chalk'
import { formatNum } from './numberfix.js'
import util from 'util'

export default async function (m, conn = {}, isEvent = false) {
  try {
    let time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const border = chalk.grey('│')
    const toRaw = (id) => id ? id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : ''

    const safeGetName = async (id) => {
      try {
        return conn.getName ? await conn.getName(id) : id.split('@')[0]
      } catch {
        return id.split('@')[0]
      }
    }

    if (isEvent) {
      const { id, action, participants, author } = m
      let groupName = await safeGetName(id)

      const eventCfg = {
        'add':             { text: 'MEMBRO ENTRATO',      icon: '📥', color: chalk.greenBright },
        'remove':          { text: 'MEMBRO USCITO',       icon: '📤', color: chalk.redBright },
        'leave':           { text: 'MEMBRO USCITO',       icon: '🚪', color: chalk.redBright },
        'promote':         { text: 'NUOVO ADMIN',         icon: '⭐ ', color: chalk.yellowBright },
        'demote':          { text: 'ADMIN REVOCATO',      icon: '🎖️ ', color: chalk.red },
        'pending':         { text: 'RICHIESTA AMMISSIONE',icon: '📨', color: chalk.cyanBright },
        'request_revoke':  { text: 'RICHIESTA REVOCATA',  icon: '🚫', color: chalk.grey },
      }[action] || { text: `EVENTO: ${action.toUpperCase()}`, icon: '⚙️ ', color: chalk.white }

      const authorJid = author ? (conn.decodeJid ? conn.decodeJid(author) : author) : null
      const authorName = authorJid ? await safeGetName(authorJid) : null
      const authorNum = authorJid ? formatNum(authorJid) : null

      const actionHasAuthor = ['remove', 'promote', 'demote'].includes(action)

      console.log(chalk.cyanBright(`╭───〔  ${chalk.bold(time)} 〕 ───┈`))
      console.log(`${border} ${eventCfg.color.bold(eventCfg.icon + ' ' + eventCfg.text)}`)
      console.log(`${border} ${chalk.magenta('👥 GRUPPO:')} ${chalk.white(groupName)}`)

      if (actionHasAuthor && authorJid) {
        console.log(`${border} ${chalk.grey('🛡️  AUTORE:')} ${chalk.white(authorName)} (${chalk.grey(authorNum)})`)
      }

      if (participants && participants.length > 0) {
        const label = {
          'add':            '➕ ENTRATO',
          'remove':         '➖ RIMOSSO',
          'leave':          '🚪 USCITO',
          'promote':        '⬆️  PROMOSSO',
          'demote':         '⬇️  RETROCESSO',
          'pending':        '⏳ RICHIEDENTE',
          'request_revoke': '❌ RITIRATA DA',
        }[action] || '👤 UTENTE'

        for (const p of participants) {
          const pJid = conn.decodeJid ? conn.decodeJid(p) : p
          const pName = await safeGetName(pJid)
          const pNum = formatNum(pJid)
          console.log(`${border} ${chalk.grey(label + ':')} ${chalk.white(pName)} (${chalk.grey(pNum)})`)
        }
      }

      console.log(chalk.cyanBright('╰────────────────────────┈\n'))
      return
    }

    const botJid = m.botId || ''
    const senderJid = m.senderJid || m.sender || ''
    const userRaw = toRaw(senderJid)
    const userFormatted = formatNum(senderJid)
    const botFormatted = formatNum(botJid)

    const formatRole = (isOwner, isAdmin, isGroupOwner) => {
        if (isOwner) return chalk.bgRed.white.bold(' CREATORE ')
        if (isGroupOwner) return chalk.bgYellow.black.bold(' OWNER ')
        if (isAdmin) return chalk.bgBlue.white.bold(' ADMIN ')
        return chalk.black.bgWhite(' MEMBRO ')
    }

    const mtype = m.mtype || (m.message ? Object.keys(m.message)[0] : 'unknown')
    const messageContent = m.text || ''
    const isCommand = (messageContent && /^[\\#&_\-+/?!*.=]/.test(messageContent))
    const weight = Buffer.byteLength(JSON.stringify(m.message || {}), 'utf8') + ' B'
    const nomeChat = m.chat.endsWith('@g.us') ? chalk.yellow(m.groupName || await safeGetName(m.chat)) : chalk.cyan('PRIVATA')

    console.log(chalk.blueBright(`╭───〔  ${chalk.bold(time)} 〕 ───┈`))
    console.log(`${border} ${chalk.grey('🤖 BOT:')} ${chalk.white(botFormatted)} [ ${formatRole(false, m.isBotAdmin, false)} ]`)
    console.log(`${border} ${chalk.grey('👤 DA :')} ${chalk.bold(m.pushName || userRaw)} (${chalk.white(userFormatted)}) | ${formatRole(m.isOwner, m.isAdmin, m.isGroupOwner)}`)
    console.log(`${border} ${chalk.grey('🆔 JID:')} ${chalk.grey(senderJid)}`)
    
    if (m.senderLid && m.senderLid !== 'N/A') {
      console.log(`${border} ${chalk.grey('🆔 LID:')} ${chalk.grey(m.senderLid)}`)
    }
    
    console.log(`${border} ${chalk.grey('📍 CHAT :')} ${nomeChat}`)
    console.log(`${border} ${chalk.grey('📦 TIPO:')} ${chalk.magenta(mtype.replace('Message', '').toUpperCase())} │ ${chalk.grey('PESO:')} ${chalk.green(weight)}`)

    if (m.quoted) {
      const quotedSender = conn.decodeJid ? conn.decodeJid(m.quoted.sender) : m.quoted.sender
      console.log(`${border} ${chalk.grey('↩️   RISPOSTA A:')} ${chalk.white(await safeGetName(quotedSender))}`)
    }


    /* DEBUG, ATTIVARE SOLO SE DEVI DECODIFICARE QUALCOSA (eg. sondaggi, messaggi raw ecc.)
    if (mtype !== 'conversation' && mtype !== 'extendedTextMessage') {
        console.log(chalk.grey('├─┈ [ DEBUG RAW MESSAGE ]'))
        const rawJson = util.inspect(m.message, { depth: 4, colors: true, showProxy: true })
        rawJson.split('\n').forEach(line => {
            console.log(`${border} ${chalk.magenta('🔍')} ${line}`)
        })
        
        const poll = m.message?.pollCreationMessageV3 || m.message?.pollCreationMessageV2 || m.message?.pollCreationMessage
        if (poll) {
            console.log(chalk.grey('├─┈ [ POLL DETAILS ]'))
            console.log(`${border} ${chalk.yellow('❓')} Domanda: ${poll.name}`)
            poll.options.forEach((opt, i) => {
                console.log(`${border} ${chalk.yellow('🔘')} Opzione ${i + 1}: ${opt.optionName}`)
            })
        }
    }
*/
    if (messageContent) {
      console.log(chalk.grey('├─┈'))
      messageContent.split('\n').forEach(line => {
        const icon = isCommand ? chalk.red('⚡ ') : chalk.blue('💬 ')
        let cLine = line.split(/(@\d+)/).map(part => {
             if (/@\d+/.test(part)) return chalk.cyanBright.bold(part)
             return isCommand ? chalk.yellowBright(part) : chalk.white(part)
        }).join('')
        console.log(`${border} ${icon} ${cLine}`)
      })
    }

    console.log(chalk.blueBright('╰────────────────────────┈\n'))

  } catch (e) {
    console.error(chalk.red(`[Print Error]:`), e)
  }
}