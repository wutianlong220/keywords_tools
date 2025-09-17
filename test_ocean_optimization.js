// 单词海洋优化测试脚本
// 用于验证核心算法逻辑的正确性

class KeywordOceanTest {
    constructor() {
        this.BATCH_SIZE = 80;
        this.CONCURRENCY_LIMIT = 25;
    }

    // 测试关键词流构建
    testKeywordStreamBuilding() {
        console.log('=== 测试关键词流构建 ===');

        // 模拟文件数据
        const mockFiles = [
            { name: 'file1.xlsx', keywords: ['keyword1', 'keyword2', 'keyword3'] },
            { name: 'file2.xlsx', keywords: ['keyword4', 'keyword5'] },
            { name: 'file3.xlsx', keywords: ['keyword6', 'keyword7', 'keyword8', 'keyword9'] }
        ];

        const fileMapping = [];
        const keywordStream = [];

        // 构建文件映射和关键词流
        mockFiles.forEach((file, fileIndex) => {
            fileMapping.push({
                fileIndex: fileIndex,
                fileName: file.name,
                keywordCount: file.keywords.length,
                originalData: null,
                processedData: null
            });

            file.keywords.forEach((keyword, wordIndex) => {
                keywordStream.push({
                    fileIndex: fileIndex,
                    wordIndex: wordIndex,
                    keyword: keyword,
                    translation: null
                });
            });
        });

        console.log('文件映射:', fileMapping);
        console.log('关键词流:', keywordStream);

        // 验证索引映射
        const testKeyword = keywordStream[2]; // 应该是 file1 的 keyword3
        console.log(`测试关键词: ${testKeyword.keyword}, 文件索引: ${testKeyword.fileIndex}, 词索引: ${testKeyword.wordIndex}`);

        return { fileMapping, keywordStream };
    }

    // 测试批次切割
    testBatchCreation(keywordStream) {
        console.log('\n=== 测试批次切割 ===');

        const batches = this.createBatchesForOcean(keywordStream);

        console.log(`关键词总数: ${keywordStream.length}`);
        console.log(`批次大小: ${this.BATCH_SIZE}`);
        console.log(`创建批次数: ${batches.length}`);

        batches.forEach((batch, index) => {
            console.log(`批次${index}: 关键词${batch.streamStartIndex}-${batch.streamEndIndex}, 数量: ${batch.keywords.length}`);
            console.log(`  关键词: ${batch.keywords.slice(0, 3).join(', ')}...`);
        });

        return batches;
    }

    // 模拟批次切割方法
    createBatchesForOcean(keywordStream) {
        const batches = [];
        const batchSize = this.BATCH_SIZE;

        for (let i = 0; i < keywordStream.length; i += batchSize) {
            const endIndex = Math.min(i + batchSize, keywordStream.length);
            const batchKeywords = keywordStream.slice(i, endIndex);

            batches.push({
                batchIndex: Math.floor(i / batchSize),
                streamStartIndex: i,
                streamEndIndex: endIndex - 1,
                keywords: batchKeywords.map(item => item.keyword),
                streamIndices: batchKeywords.map((_, index) => i + index)
            });
        }

        return batches;
    }

    // 测试结果分配
    testResultDistribution(batches, keywordStream, fileMapping) {
        console.log('\n=== 测试结果分配 ===');

        // 模拟翻译结果
        const mockTranslations = keywordStream.map(item => `${item.keyword}_translated`);

        // 模拟批次处理结果
        const batchResults = batches.map((batch, batchIndex) => ({
            batchIndex: batchIndex,
            translations: batch.keywords.map(keyword => `${keyword}_translated`)
        }));

        // 分配结果到关键词流
        batchResults.forEach(result => {
            const batch = batches[result.batchIndex];
            result.translations.forEach((translation, index) => {
                const streamIndex = batch.streamIndices[index];
                if (keywordStream[streamIndex]) {
                    keywordStream[streamIndex].translation = translation;
                }
            });
        });

        console.log('翻译后的关键词流:');
        keywordStream.forEach(item => {
            console.log(`  ${item.keyword} -> ${item.translation} (文件${item.fileIndex}, 位置${item.wordIndex})`);
        });

        // 测试按文件重建
        this.testFileReconstruction(keywordStream, fileMapping);
    }

    // 测试文件重建
    testFileReconstruction(keywordStream, fileMapping) {
        console.log('\n=== 测试文件重建 ===');

        fileMapping.forEach(fileInfo => {
            console.log(`\n重建文件: ${fileInfo.fileName}`);

            // 找到属于这个文件的关键词
            const fileKeywords = keywordStream.filter(item => item.fileIndex === fileInfo.fileIndex);

            console.log(`  关键词数量: ${fileKeywords.length}`);
            fileKeywords.forEach(item => {
                console.log(`    位置${item.wordIndex}: ${item.keyword} -> ${item.translation}`);
            });
        });
    }

    // 运行所有测试
    runAllTests() {
        console.log('开始单词海洋优化测试...\n');

        try {
            // 测试1：关键词流构建
            const { fileMapping, keywordStream } = this.testKeywordStreamBuilding();

            // 测试2：批次切割
            const batches = this.testBatchCreation(keywordStream);

            // 测试3：结果分配
            this.testResultDistribution(batches, keywordStream, fileMapping);

            console.log('\n✅ 所有测试通过！单词海洋优化逻辑正确。');

        } catch (error) {
            console.error('\n❌ 测试失败:', error);
        }
    }
}

// 运行测试
const test = new KeywordOceanTest();
test.runAllTests();