import PDFDocument from 'pdfkit';

export abstract class PdfExportBase {
  protected createDocument(): PDFKit.PDFDocument {
    return new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
      info: {
        Producer: 'AI Meta Ads Studio',
        Creator: 'AI Meta Ads Studio',
      },
    });
  }

  protected async toBuffer(
    document: PDFKit.PDFDocument,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      document.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      document.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      document.on('error', reject);

      document.end();
    });
  }

  protected addTitle(
    document: PDFKit.PDFDocument,
    title: string,
  ): void {
    document
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(title);

    document.moveDown(1);
  }

  protected addSection(
    document: PDFKit.PDFDocument,
    title: string,
  ): void {
    document
      .moveDown()
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(title);

    document.moveDown(0.5);
  }

  protected addKeyValue(
    document: PDFKit.PDFDocument,
    label: string,
    value: unknown,
  ): void {
    document
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`${label}: `, {
        continued: true,
      });

    document
      .font('Helvetica')
      .text(this.stringify(value));
  }

  protected addSeparator(
    document: PDFKit.PDFDocument,
  ): void {
    const y = document.y;

    document
      .moveTo(50, y)
      .lineTo(545, y)
      .stroke();

    document.moveDown();
  }

  protected addTable(
    document: PDFKit.PDFDocument,
    headers: string[],
    rows: Array<Array<unknown>>,
  ): void {
    document.font('Helvetica-Bold');

    headers.forEach((header, index) => {
      document.text(header, 50 + index * 100, document.y, {
        width: 95,
      });
    });

    document.moveDown();

    document.font('Helvetica');

    rows.forEach((row) => {
      row.forEach((value, index) => {
        document.text(
          this.stringify(value),
          50 + index * 100,
          document.y,
          {
            width: 95,
          },
        );
      });

      document.moveDown();

      if (document.y > 730) {
        document.addPage();
      }
    });
  }

  protected addFooter(
    document: PDFKit.PDFDocument,
  ): void {
    const pages = document.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      document.switchToPage(i);

      document
        .fontSize(9)
        .font('Helvetica')
        .text(
          `Generated ${new Date().toLocaleString()} • Page ${i + 1} of ${pages.count}`,
          50,
          770,
          {
            align: 'center',
            width: 500,
          },
        );
    }
  }

  protected stringify(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}