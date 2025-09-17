// 测试AbortController timeoutId Bug修复
class AbortControllerTest {
    testTimeoutIdCleanup() {
        console.log('=== 测试AbortController timeoutId清理逻辑 ===');

        let timeoutIdCounter = 0;
        let activeTimeouts = new Set();

        // 模拟setTimeout和clearTimeout
        const originalSetTimeout = global.setTimeout;
        const originalClearTimeout = global.clearTimeout;

        global.setTimeout = (callback, delay) => {
            const id = ++timeoutIdCounter;
            console.log(`创建timeout #${id}, 延迟${delay}ms`);
            activeTimeouts.add(id);

            const realId = originalSetTimeout(() => {
                console.log(`Timeout #${id} 触发`);
                activeTimeouts.delete(id);
                callback();
            }, delay);

            return realId;
        };

        global.clearTimeout = (id) => {
            if (id && activeTimeouts.has(timeoutIdCounter)) {
                console.log(`清理timeout #${timeoutIdCounter}`);
                activeTimeouts.delete(timeoutIdCounter);
            }
            return originalClearTimeout(id);
        };

        // 模拟修复前的逻辑（有Bug）
        console.log('\n--- 模拟修复前的逻辑（有Bug） ---');
        this.simulateBuggyLogic();

        // 模拟修复后的逻辑
        console.log('\n--- 模拟修复后的逻辑（已修复） ---');
        this.simulateFixedLogic();

        // 恢复原函数
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;

        console.log('\n✅ 测试完成');
    }

    simulateBuggyLogic() {
        // 模拟修复前的逻辑：catch块中没有clearTimeout
        let attempt = 1;
        const MAX_RETRIES = 2;

        const simulateAttempt = () => {
            console.log(`\n第${attempt}次尝试:`);

            try {
                // 创建timeout（这是有问题的）
                const timeoutId = setTimeout(() => {
                    console.log('❌ Bug: Timeout触发，abort了后续请求!');
                }, 30000);
                console.log(`创建timeout，但不在catch中清理`);

                // 模拟请求失败
                throw new Error('Network error');

            } catch (error) {
                console.log(`请求失败: ${error.message}`);
                // ❌ Bug: 这里没有清理timeoutId!

                if (attempt <= MAX_RETRIES) {
                    attempt++;
                    console.log('1秒后重试...');
                    setTimeout(simulateAttempt, 1000);
                }
            }
        };

        simulateAttempt();
    }

    simulateFixedLogic() {
        // 重置
        let attempt = 1;
        const MAX_RETRIES = 2;

        const simulateAttempt = () => {
            console.log(`\n第${attempt}次尝试:`);

            let timeoutId;
            try {
                timeoutId = setTimeout(() => {
                    console.log('Timeout触发（正常情况）');
                }, 30000);
                console.log('创建timeout');

                // 模拟请求失败
                throw new Error('Network error');

            } catch (error) {
                // ✅ 修复：在catch中清理timeoutId
                clearTimeout(timeoutId);
                console.log(`请求失败: ${error.message}, timeout已清理`);

                if (attempt <= MAX_RETRIES) {
                    attempt++;
                    console.log('1秒后重试...');
                    setTimeout(simulateAttempt, 1000);
                }
            }
        };

        simulateAttempt();
    }
}

// 运行测试
const test = new AbortControllerTest();
test.testTimeoutIdCleanup();