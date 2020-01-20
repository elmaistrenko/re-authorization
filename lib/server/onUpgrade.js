module.exports = function (handlers) {
    this.on('upgrade', (req, socket, head) => {
        let handled = false;
        [
            ...handlers,
            function () {
                socket.destroy();
            },
        ].forEach(handleUpgrade => {
            if (!handled && !socket.destroyed) {
                const r = handleUpgrade(req, socket, head);
                if (r === true) {
                    handled = true;
                } else if (r === false) {
                    socket.destroy();
                }
            }
        });
    });
};
