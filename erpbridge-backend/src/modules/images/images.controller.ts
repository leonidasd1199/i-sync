import { Controller, Get, Param, Res } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import type { Response } from "express";
import * as fs from "fs";
import * as path from "path";

@Controller("images")
export class ImagesController {
  private readonly logger = new Logger(ImagesController.name);

  private readonly searchPaths: string[] = (process.env.IMAGES_PATHS || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  private readonly fallbackPath = path.resolve(
    path.join(process.cwd(), "public", "carrito.png")
  );

  @Get("debug/find/:filename")
  async debugFind(@Param("filename") filename: string) {
    const decoded = decodeURIComponent(filename).trim().toLowerCase();
    const targetBase = decoded.replace(/\.[a-z0-9]+$/i, "");

    const report = {
      searching: filename,
      decoded,
      targetBase,
      searchPaths: this.searchPaths,
      attempts: [] as any[],
      found: null as string | null,
    };

    for (const base of this.searchPaths) {
      const result = this.recursiveDebug(base, targetBase, report);
      if (typeof result === "string") {
        report.found = result;
        break;
      }
    }

    return report;
  }

  private recursiveDebug(dir: string, targetBase: string, report: any): string | null {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      report.attempts.push({
        error: "READ_FAIL",
        dir,
        message: (err as Error).message,
      });
      return null;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const result = this.recursiveDebug(full, targetBase, report);
        if (result) return result;
      } else {
        const nameLower = entry.name.toLowerCase();
        const baseName = nameLower.replace(/\.[a-z0-9]+$/i, "");
        const match = baseName === targetBase;

        report.attempts.push({ file: entry.name, baseName, match });

        if (match) return full;
      }
    }

    return null;
  }

  @Get(":filename")
  async getImage(@Param("filename") filename: string, @Res() res: Response) {
    const decoded = decodeURIComponent(filename).trim();
    const lower = decoded.toLowerCase();
    const targetBase = lower.replace(/\.[a-z0-9]+$/i, "");

    for (const base of this.searchPaths) {
      const direct = path.join(base, decoded);

      if (fs.existsSync(direct)) {
        const absolute = path.resolve(direct);
        this.logger.debug(`Serving direct: ${absolute}`);

        return res.sendFile(absolute, (err) => {
          if (err) {
            this.logger.error(`sendFile error (direct): ${(err as Error).message}`);
            if (!res.headersSent) {
              res.sendFile(this.fallbackPath);
            }
          }
        });
      }
    }

    for (const base of this.searchPaths) {
      const found = this.recursiveFind(base, targetBase);

      if (typeof found === "string") {
        const absolute = path.resolve(found);
        this.logger.debug(`Serving (recursive find): ${absolute}`);

        return res.sendFile(absolute, (err) => {
          if (err) {
            this.logger.error(`sendFile error (found): ${(err as Error).message}`);
            if (!res.headersSent) {
              res.sendFile(this.fallbackPath);
            }
          }
        });
      }
    }

    this.logger.debug(`Serving fallback for: ${filename}`);
    return res.sendFile(this.fallbackPath);
  }

  private recursiveFind(dir: string, targetBase: string): string | null {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const result = this.recursiveFind(full, targetBase);
        if (result) return result;
      } else {
        const lower = entry.name.toLowerCase();
        const baseName = lower.replace(/\.[a-z0-9]+$/i, "");

        if (baseName === targetBase) {
          return full;
        }
      }
    }

    return null;
  }
}
