export async function soloadmin(m, { isAdmin, isOwner }) {
    if (m.isBaileys || !m.isGroup) return true
    
    const chat = global.db.data.groups[m.chat]
    
    if (chat?.soloadmin) {
        const isAuthorized = isAdmin || isOwner || m.fromMe
        
        if (!isAuthorized) {
            return false
        }
    }
    
    return true
}
