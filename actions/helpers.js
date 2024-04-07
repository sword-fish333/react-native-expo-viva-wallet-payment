export function formatMessage(message) {
    if (Array.isArray(message)) {
        return message[message.length - 1]
    } else if (typeof message === 'string') {
        return message
    } else {
        return 'Error'
    }
}