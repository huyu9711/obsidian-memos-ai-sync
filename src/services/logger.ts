// 日志服务类，用于统一管理日志输出
export class Logger {
    private static isDevelopment = false; // 默认关闭调试日志
    private prefix: string;

    constructor(context: string) {
        this.prefix = `[${context}]`;
    }

    // 只在开发环境下输出调试信息
    debug(...args: unknown[]) {
        if (Logger.isDevelopment) {
            console.log(this.prefix, ...args);
        }
    }

    // 警告信息，生产环境也会输出
    warn(...args: unknown[]) {
        console.warn(this.prefix, ...args);
    }

    // 错误信息，生产环境也会输出
    error(...args: unknown[]) {
        console.error(this.prefix, ...args);
    }
} 