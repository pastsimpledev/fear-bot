import { jidNormalizedUser } from "@realvare/baileys"

export async function before(m, { conn, isOwner }) {
    // Verifichiamo se l'evento è una richiesta di accesso al gruppo
    if (m.isGroup && m.messageStubType === 172) { // 172 è il codice stub per "richiesta di accesso"
        const groupJid = m.chat
        const candidateJid = m.messageStubParameters[0] // Il JID di chi ha chiesto di entrare
        
        // Normalizziamo i JID per il confronto
        const normalizedCandidate = jidNormalizedUser(candidateJid)
        const ownerNumbers = global.owner.map(o => jidNormalizedUser(o[0] + '@s.whatsapp.net'))

        // Se il candidato è nella lista degli owner, lo accettiamo
        if (ownerNumbers.includes(normalizedCandidate)) {
            try {
                await conn.groupRequestParticipantsUpdate(groupJid, [normalizedCandidate], 'approve')
                await conn.sendMessage(groupJid, { 
                    text: `\ @${normalizedCandidate.split('@')[0]} è stato accettato automaticamente._`,
                    mentions: [normalizedCandidate]
                })
            } catch (e) {
                console.error('Errore auto-accept:', e)
            }
        }
    }
}