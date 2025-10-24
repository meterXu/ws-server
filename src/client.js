import axios from "axios";
import fs from 'node:fs'
import path from "node:path";

async function main() {
    const args = process.argv.slice(2)
    const filePath = args[0]
    await uploadFileInChunks(filePath)
}


async function uploadFileInChunks(filePath, chunkSize = 700000) { // 500 KB per chunk
    const fileName = path.basename(filePath);
    const totalSize = fs.statSync(filePath).size;
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const readStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
    let chunkIndex = 0;
    for await (const chunk of readStream) {
        console.log(`读取分片 ${chunkIndex + 1}/${totalChunks}`);
        await sleep()
        await uploadChunk(chunk.toString('base64'), chunkIndex, totalChunks,fileName);
        chunkIndex++;
    }
    console.log('文件读取完毕');
}
async function sleep(time=1000){
    return new Promise((resolve, reject) => {
        setTimeout(()=>{
            Promise.resolve()
        },time)
    })
}

async function uploadChunk(chunk, index, totalChunks,fileName) {
    console.log(`Uploading chunk ${index + 1}/${totalChunks}...`);
        // http://221.229.220.214:3000/api/upload
    // http://localhost:3000/api/upload
    await axios.post('http://221.229.220.214:3000/api/upload', {
        fileClip: chunk,
        fileName: fileName,
        index,
        isFinish:index+1===totalChunks
    })
    console.log(`${fileName} Chunk ${index + 1} uploaded`);
}

main()
