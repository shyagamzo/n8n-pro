/**
 * Logging utility for the extension
 */

export enum LogLevel
{
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger
{
    private static level: LogLevel = LogLevel.INFO;

    public static setLevel(level: LogLevel): void
    {
        this.level = level;
    }

    public static debug(message: string, data?: any): void
    {
        if (this.level <= LogLevel.DEBUG)
        {
            console.debug(`[DEBUG] ${message}`, data);
        }
    }

    public static info(message: string, data?: any): void
    {
        if (this.level <= LogLevel.INFO)
        {
            console.info(`[INFO] ${message}`, data);
        }
    }

    public static warn(message: string, data?: any): void
    {
        if (this.level <= LogLevel.WARN)
        {
            console.warn(`[WARN] ${message}`, data);
        }
    }

    public static error(message: string, error?: Error): void
    {
        if (this.level <= LogLevel.ERROR)
        {
            console.error(`[ERROR] ${message}`, error);
        }
    }
}
