import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { describe, it } from "node:test";
import { deflateRawSync } from "node:zlib";
import {
  excelSerialToDate,
  isSpreadsheetAttachment,
  parseSpreadsheetWorkbook,
  readZipEntries,
} from "../spreadsheet";

interface ZipEntryInput {
  name: string;
  contents: string;
  compress?: boolean;
}

describe("isSpreadsheetAttachment", () => {
  it("detects spreadsheet attachments from MIME type and file name", () => {
    assert.equal(
      isSpreadsheetAttachment({
        name: "budget.xlsx",
        type: "application/octet-stream",
      }),
      true
    );
    assert.equal(
      isSpreadsheetAttachment({
        name: "document.pdf",
        type: "application/pdf",
      }),
      false
    );
  });

  it("handles MIME parameters, aliases, and filenames with trailing whitespace", () => {
    assert.equal(
      isSpreadsheetAttachment({
        name: "quarterly-report.xlsx ",
        type: "application/octet-stream; charset=binary",
      }),
      true
    );
    assert.equal(
      isSpreadsheetAttachment({
        name: "report",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8",
      }),
      true
    );
    assert.equal(
      isSpreadsheetAttachment({
        name: "legacy-sheet",
        type: "application/xlsx",
      }),
      true
    );
  });
});

describe("readZipEntries", () => {
  it("reads stored and deflated entries from a zip archive", async () => {
    const archive = buildZipArchive([
      { name: "plain.txt", contents: "stored data", compress: false },
      { name: "compressed.txt", contents: "deflated data" },
    ]);

    const entries = await readZipEntries(archive);

    assert.equal(new TextDecoder().decode(entries.get("plain.txt")), "stored data");
    assert.equal(new TextDecoder().decode(entries.get("compressed.txt")), "deflated data");
  });
});

describe("parseSpreadsheetWorkbook", () => {
  it("parses sheets, cell values, widths, and styles from an xlsx workbook", async () => {
    const workbook = await parseSpreadsheetWorkbook(buildFixtureWorkbook());
    assert.equal(workbook.sheets.length, 1);

    const sheet = workbook.sheets[0];
    assert.equal(sheet.name, "Styled Sheet");
    assert.equal(sheet.maxRow, 3);
    assert.equal(sheet.maxColumn, 3);
    assert.equal(sheet.columnWidths[1], 138);

    const styledCell = sheet.cells["1:1"];
    assert.equal(styledCell.value, "Hello");
    assert.equal(styledCell.style.bold, true);
    assert.equal(styledCell.style.color, "#4F81BD");
    assert.equal(styledCell.style.backgroundColor, "#FFF2CC");
    assert.equal(styledCell.style.horizontalAlign, "center");
    assert.equal(styledCell.style.verticalAlign, "middle");
    assert.equal(styledCell.style.wrapText, true);

    const inlineCell = sheet.cells["1:2"];
    assert.equal(inlineCell.value, "Inline");

    const booleanCell = sheet.cells["2:1"];
    assert.equal(booleanCell.value, "TRUE");

    const dateCell = sheet.cells["2:2"];
    assert.match(dateCell.value, /2024/);
  });
});

describe("excelSerialToDate", () => {
  it("converts Excel serial dates using the 1900 date system", () => {
    const date = excelSerialToDate(45292, false);
    assert.equal(date.toISOString(), "2024-01-01T00:00:00.000Z");
  });
});

function buildFixtureWorkbook(): ArrayBuffer {
  return buildZipArchive([
    {
      name: "_rels/.rels",
      contents: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      contents: `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr date1904="0"/>
  <sheets>
    <sheet name="Styled Sheet" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      contents: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    {
      name: "xl/sharedStrings.xml",
      contents: `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
  <si><t>Hello</t></si>
</sst>`,
    },
    {
      name: "xl/styles.xml",
      contents: `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="12"/><name val="Aptos"/><color theme="4"/></font>
    <font><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="14" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`,
    },
    {
      name: "xl/theme/theme1.xml",
      contents: `<?xml version="1.0" encoding="UTF-8"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk1><a:srgbClr val="000000"/></a:dk1>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:dk2><a:srgbClr val="1F497D"/></a:dk2>
      <a:accent1><a:srgbClr val="4F81BD"/></a:accent1>
      <a:accent2><a:srgbClr val="C0504D"/></a:accent2>
      <a:accent3><a:srgbClr val="9BBB59"/></a:accent3>
      <a:accent4><a:srgbClr val="8064A2"/></a:accent4>
      <a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
      <a:accent6><a:srgbClr val="F79646"/></a:accent6>
      <a:hlink><a:srgbClr val="0000FF"/></a:hlink>
      <a:folHlink><a:srgbClr val="800080"/></a:folHlink>
    </a:clrScheme>
  </a:themeElements>
</a:theme>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      contents: `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:C3"/>
  <cols>
    <col min="1" max="1" width="18"/>
  </cols>
  <sheetData>
    <row r="1">
      <c r="A1" t="s" s="1"><v>0</v></c>
      <c r="B1" t="inlineStr"><is><t>Inline</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="b"><v>1</v></c>
      <c r="B2" s="2"><v>45292</v></c>
    </row>
  </sheetData>
</worksheet>`,
    },
  ]);
}

function buildZipArchive(entries: ZipEntryInput[]): ArrayBuffer {
  const localFileParts: Buffer[] = [];
  const centralDirectoryParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const contents = Buffer.from(entry.contents, "utf8");
    const compressedContents =
      entry.compress === false ? contents : deflateRawSync(contents);
    const compressionMethod = entry.compress === false ? 0 : 8;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(compressionMethod, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(compressedContents.length, 18);
    localHeader.writeUInt32LE(contents.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localFileParts.push(localHeader, name, compressedContents);

    const centralDirectoryHeader = Buffer.alloc(46);
    centralDirectoryHeader.writeUInt32LE(0x02014b50, 0);
    centralDirectoryHeader.writeUInt16LE(20, 4);
    centralDirectoryHeader.writeUInt16LE(20, 6);
    centralDirectoryHeader.writeUInt16LE(0, 8);
    centralDirectoryHeader.writeUInt16LE(compressionMethod, 10);
    centralDirectoryHeader.writeUInt32LE(0, 12);
    centralDirectoryHeader.writeUInt32LE(0, 16);
    centralDirectoryHeader.writeUInt32LE(compressedContents.length, 20);
    centralDirectoryHeader.writeUInt32LE(contents.length, 24);
    centralDirectoryHeader.writeUInt16LE(name.length, 28);
    centralDirectoryHeader.writeUInt16LE(0, 30);
    centralDirectoryHeader.writeUInt16LE(0, 32);
    centralDirectoryHeader.writeUInt16LE(0, 34);
    centralDirectoryHeader.writeUInt16LE(0, 36);
    centralDirectoryHeader.writeUInt32LE(0, 38);
    centralDirectoryHeader.writeUInt32LE(offset, 42);

    centralDirectoryParts.push(centralDirectoryHeader, name);
    offset += localHeader.length + name.length + compressedContents.length;
  }

  const centralDirectoryStart = offset;
  const centralDirectory = Buffer.concat(centralDirectoryParts);

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryStart, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  const archive = Buffer.concat([
    ...localFileParts,
    centralDirectory,
    endOfCentralDirectory,
  ]);
  return archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength
  );
}
