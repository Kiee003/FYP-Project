class AuditQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    async add(url, auditFunction) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                url,
                auditFunction,
                resolve,
                reject
            });
            
            this.process();
        });
    }

    async process() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            try {
                const result = await item.auditFunction(item.url);
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
            
            // Add delay between audits to prevent resource exhaustion
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        this.isProcessing = false;
    }
}

module.exports = new AuditQueue();