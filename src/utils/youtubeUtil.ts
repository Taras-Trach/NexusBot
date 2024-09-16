import fs from 'fs';
import * as path from 'path';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import sharp from 'sharp';
import { unlinkAsync } from './fileUtils';

export async function downloadYouTubeAudio(videoUrl: any, outputPath: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const dir = path.dirname('videos');
            await fs.promises.mkdir(dir, { recursive: true });

            const video = ytdl(videoUrl, {
                quality: 'highestaudio',
                filter: 'audioonly',
            });

            video.on('error', (error) => {
                reject(error);
            });

            const fileStream = fs.createWriteStream(outputPath);

            fileStream.on('error', (error) => {
                reject(error);
            });

            video.pipe(fileStream)
                .on('finish', () => resolve())
                .on('error', (error: any) => reject(error));
        } catch (error) {
            reject(error);
        }
    });
}

export async function convertToMp3(videoPath: string, savePath: string): Promise<void> {
    await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .audioBitrate(320)
            .save(savePath)
            .on('end', resolve)
            .on('error', reject);
    });
}

export async function downloadThumbnail(thumbnailUrl: string, savePath: string): Promise<void> {
    const thumbnailResponse = await axios.get(thumbnailUrl, { responseType: 'arraybuffer' });

    await sharp(thumbnailResponse.data)
        .resize(320, 320, {
            fit: 'cover',
            position: 'center'
        })
        .jpeg({ quality: 100 })
        .toFile(savePath);
}

export async function cleanUpFiles(videoPath: string, audioPath: string, thumbnailPath: string): Promise<void> {
    await unlinkAsync(videoPath);
    await unlinkAsync(audioPath);
    await unlinkAsync(thumbnailPath);
}

export function ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}