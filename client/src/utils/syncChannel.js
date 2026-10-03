const CHANNEL_NAME = 'ceramica_sync_pedidos';

let channel = null;
try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel(CHANNEL_NAME);
    }
} catch (_e) {
    channel = null;
}

function emit(type, id, meta = {}) {
    try {
        channel?.postMessage({
            type,
            id,
            meta,
            timestamp: Date.now(),
        });
    } catch (_e) {}
}

function subscribe(type, callback) {
    if (!channel) return () => {};
    const listener = (event) => {
        if (event?.data?.type === type) {
            callback(event.data);
        }
    };
    channel.addEventListener('message', listener);
    return () => {
        try {
            channel.removeEventListener('message', listener);
        } catch (_e) {}
    };
}

export function emitPedidoUpdated(id, meta = {}) {
    emit('PEDIDO_UPDATED', id, meta);
}

export function onPedidoUpdated(callback) {
    return subscribe('PEDIDO_UPDATED', callback);
}

export function emitClienteUpdated(id, meta = {}) {
    emit('CLIENTE_UPDATED', id, meta);
}

export function onClienteUpdated(callback) {
    return subscribe('CLIENTE_UPDATED', callback);
}
