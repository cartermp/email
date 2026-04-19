import { EmailBodyPart } from "./types";

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

const ROOT_RELATIONSHIP_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";

const THEME_COLOR_ORDER = [
  "lt1",
  "dk1",
  "lt2",
  "dk2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
] as const;

const BUILTIN_NUMBER_FORMATS: Record<number, string> = {
  14: "m/d/yyyy",
  15: "d-mmm-yy",
  16: "d-mmm",
  17: "mmm-yy",
  18: "h:mm AM/PM",
  19: "h:mm:ss AM/PM",
  20: "h:mm",
  21: "h:mm:ss",
  22: "m/d/yyyy h:mm",
  45: "mm:ss",
  46: "[h]:mm:ss",
  47: "mmss.0",
};

const BUILTIN_DATE_FORMAT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

const INDEXED_COLORS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#800000",
  "#008000",
  "#000080",
  "#808000",
  "#800080",
  "#008080",
  "#C0C0C0",
  "#808080",
  "#9999FF",
  "#993366",
  "#FFFFCC",
  "#CCFFFF",
  "#660066",
  "#FF8080",
  "#0066CC",
  "#CCCCFF",
  "#000080",
  "#FF00FF",
  "#FFFF00",
  "#00FFFF",
  "#800080",
  "#800000",
  "#008080",
  "#0000FF",
  "#00CCFF",
  "#CCFFFF",
  "#CCFFCC",
  "#FFFF99",
  "#99CCFF",
  "#FF99CC",
  "#CC99FF",
  "#FFCC99",
  "#3366FF",
  "#33CCCC",
  "#99CC00",
  "#FFCC00",
  "#FF9900",
  "#FF6600",
  "#666699",
  "#969696",
  "#003366",
  "#339966",
  "#003300",
  "#333300",
  "#993300",
  "#993366",
  "#333399",
  "#333333",
] as const;

const SPREADSHEET_EXTENSIONS = new Set(["xlsx", "xlsm", "xltx", "xltm", "xlsb", "xls"]);
const SPREADSHEET_MIME_TYPES = new Set([
  "application/vnd.ms-excel",
  "application/msexcel",
  "application/x-excel",
  "application/x-msexcel",
  "application/x-xls",
  "application/xls",
  "application/xlsx",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.ms-excel.template.macroenabled.12",
  "application/vnd.ms-excel.sheet.binary.macroenabled.12",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
]);

const textDecoder = new TextDecoder();

interface XmlBlock {
  attributes: Record<string, string>;
  inner: string;
}

interface FontStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

interface FillStyle {
  backgroundColor?: string;
}

interface CellFormatStyle extends SpreadsheetCellStyle {
  numberFormat?: string;
  isDate?: boolean;
}

export interface SpreadsheetCellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  horizontalAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  wrapText?: boolean;
}

export interface SpreadsheetCell {
  ref: string;
  row: number;
  column: number;
  value: string;
  style: SpreadsheetCellStyle;
}

export interface SpreadsheetSheet {
  name: string;
  maxRow: number;
  maxColumn: number;
  cells: Record<string, SpreadsheetCell>;
  columnWidths: Record<number, number>;
}

export interface SpreadsheetWorkbook {
  sheets: SpreadsheetSheet[];
}

export class SpreadsheetPreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpreadsheetPreviewError";
  }
}

export function isSpreadsheetAttachment(
  attachment: Pick<EmailBodyPart, "name" | "type">
): boolean {
  const type = normalizeMimeType(attachment.type);
  const extension = extensionFromName(attachment.name);
  return (
    SPREADSHEET_MIME_TYPES.has(type) ||
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    (extension !== null && SPREADSHEET_EXTENSIONS.has(extension))
  );
}

export function columnNumberToName(column: number): string {
  let current = column;
  let result = "";
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

export function excelSerialToDate(serial: number, uses1904DateSystem: boolean): Date {
  const baseUtc = uses1904DateSystem
    ? Date.UTC(1904, 0, 1)
    : Date.UTC(1899, 11, 30);
  return new Date(baseUtc + serial * 24 * 60 * 60 * 1000);
}

export async function readZipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map<string, Uint8Array>();

  let cursor = centralDirectoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(cursor, true) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new SpreadsheetPreviewError("The spreadsheet archive is malformed.");
    }

    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraFieldLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const fileName = decodeText(bytes.subarray(cursor + 46, cursor + 46 + fileNameLength));

    const localHeaderView = new DataView(bytes.buffer, bytes.byteOffset + localHeaderOffset);
    if (localHeaderView.getUint32(0, true) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
      throw new SpreadsheetPreviewError("The spreadsheet archive is malformed.");
    }

    const localFileNameLength = localHeaderView.getUint16(26, true);
    const localExtraFieldLength = localHeaderView.getUint16(28, true);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedBytes = bytes.subarray(dataStart, dataStart + compressedSize);

    if (!fileName.endsWith("/")) {
      entries.set(fileName, await decompressEntry(compressedBytes, compressionMethod));
    }

    cursor += 46 + fileNameLength + extraFieldLength + commentLength;
  }

  return entries;
}

export async function parseSpreadsheetWorkbook(
  buffer: ArrayBuffer
): Promise<SpreadsheetWorkbook> {
  const bytes = new Uint8Array(buffer);
  if (isLegacyCompoundDocument(bytes)) {
    throw new SpreadsheetPreviewError(
      "Legacy .xls files cannot be previewed here yet. Download the file to open it in Excel."
    );
  }
  if (!isZipArchive(bytes)) {
    throw new SpreadsheetPreviewError("This spreadsheet format is not supported for preview.");
  }

  const entries = await readZipEntries(buffer);
  const workbookPath = findWorkbookPath(entries);
  if (workbookPath.endsWith(".bin")) {
    throw new SpreadsheetPreviewError(
      "Binary Excel workbooks (.xlsb) are not supported for preview."
    );
  }
  if (!workbookPath.endsWith(".xml")) {
    throw new SpreadsheetPreviewError("This spreadsheet format is not supported for preview.");
  }

  const workbookXml = getEntryText(entries, workbookPath);
  const workbookRelationships = parseRelationships(
    getEntryText(entries, relationshipPathFor(workbookPath), "")
  );
  const sharedStrings = parseSharedStrings(
    getEntryText(entries, resolveRelativePath(workbookPath, "sharedStrings.xml"), "")
  );
  const themeColors = parseThemeColors(
    getEntryText(entries, resolveRelativePath(workbookPath, "theme/theme1.xml"), "")
  );
  const styles = parseStyles(
    getEntryText(entries, resolveRelativePath(workbookPath, "styles.xml"), ""),
    themeColors
  );
  const uses1904DateSystem = /<workbookPr\b[^>]*date1904="(?:1|true)"/i.test(workbookXml);

  const sheets = collectElementBlocks(workbookXml, "sheet")
    .map((sheetBlock) => {
      const relationshipId = sheetBlock.attributes["r:id"];
      if (!relationshipId) return null;
      const target = workbookRelationships.get(relationshipId);
      if (!target) return null;
      const path = resolveRelativePath(workbookPath, target);
      return {
        name: decodeXmlEntities(sheetBlock.attributes.name ?? "Sheet"),
        hidden:
          sheetBlock.attributes.state === "hidden" ||
          sheetBlock.attributes.state === "veryHidden",
        path,
      };
    })
    .filter((sheet): sheet is { name: string; hidden: boolean; path: string } => sheet !== null);

  const visibleSheets = sheets.filter((sheet) => !sheet.hidden);
  const sheetsToRender = visibleSheets.length > 0 ? visibleSheets : sheets;

  return {
    sheets: sheetsToRender.map((sheet) =>
      parseSheet(
        sheet.name,
        getEntryText(entries, sheet.path),
        sharedStrings,
        styles,
        uses1904DateSystem
      )
    ),
  };
}

function extensionFromName(name?: string): string | null {
  if (!name) return null;
  const normalizedName = name.trim().toLowerCase();
  const match = /\.([^.]+)$/.exec(normalizedName);
  return match?.[1] ?? null;
}

function normalizeMimeType(type?: string): string {
  return type?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isZipArchive(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
  );
}

function isLegacyCompoundDocument(bytes: Uint8Array): boolean {
  const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return signature.every((value, index) => bytes[index] === value);
}

function findEndOfCentralDirectory(view: DataView): number {
  const minimumOffset = Math.max(0, view.byteLength - 0xffff - 22);
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }
  throw new SpreadsheetPreviewError("The spreadsheet archive is malformed.");
}

async function decompressEntry(
  compressedBytes: Uint8Array,
  compressionMethod: number
): Promise<Uint8Array> {
  if (compressionMethod === 0) return compressedBytes;
  if (compressionMethod !== 8) {
    throw new SpreadsheetPreviewError("The spreadsheet uses an unsupported compression method.");
  }

  const payload = new ArrayBuffer(compressedBytes.byteLength);
  new Uint8Array(payload).set(compressedBytes);
  const stream = new Blob([payload])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const decompressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(decompressed);
}

function decodeText(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

function getEntryText(
  entries: Map<string, Uint8Array>,
  path: string,
  fallback?: string
): string {
  const entry = entries.get(path);
  if (!entry) {
    if (fallback !== undefined) return fallback;
    throw new SpreadsheetPreviewError(`Missing spreadsheet entry: ${path}`);
  }
  return decodeText(entry);
}

function findWorkbookPath(entries: Map<string, Uint8Array>): string {
  const rootRelationshipsXml = getEntryText(entries, "_rels/.rels", "");
  const rootRelationships = parseRelationships(rootRelationshipsXml);
  const rootRelationshipTypes = parseRelationshipTypes(rootRelationshipsXml);
  const officeDocumentTarget = [...rootRelationships.entries()]
    .map(([id, target]) => ({
      type: rootRelationshipTypes.get(id),
      target,
    }))
    .find((relationship) => relationship.type === ROOT_RELATIONSHIP_TYPE)?.target;
  if (officeDocumentTarget) {
    return resolveRelativePath("", officeDocumentTarget);
  }
  if (entries.has("xl/workbook.xml")) return "xl/workbook.xml";
  throw new SpreadsheetPreviewError("This spreadsheet does not contain a workbook.xml file.");
}

function relationshipPathFor(filePath: string): string {
  const lastSlash = filePath.lastIndexOf("/");
  const directory = lastSlash === -1 ? "" : filePath.slice(0, lastSlash + 1);
  const fileName = lastSlash === -1 ? filePath : filePath.slice(lastSlash + 1);
  return `${directory}_rels/${fileName}.rels`;
}

function resolveRelativePath(baseFilePath: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const lastSlash = baseFilePath.lastIndexOf("/");
  const baseDirectory = lastSlash === -1 ? "" : baseFilePath.slice(0, lastSlash + 1);
  const normalized: string[] = [];
  for (const part of `${baseDirectory}${target}`.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized.join("/");
}

function parseRelationships(xml: string): Map<string, string> {
  const relationships = new Map<string, string>();
  for (const block of collectElementBlocks(xml, "Relationship")) {
    if (block.attributes.Id && block.attributes.Target) {
      relationships.set(block.attributes.Id, block.attributes.Target);
    }
  }
  return relationships;
}

function parseRelationshipTypes(xml: string): Map<string, string> {
  const relationships = new Map<string, string>();
  for (const block of collectElementBlocks(xml, "Relationship")) {
    if (block.attributes.Id && block.attributes.Type) {
      relationships.set(block.attributes.Id, block.attributes.Type);
    }
  }
  return relationships;
}

function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];
  return collectElementBlocks(xml, "si").map((stringItem) => extractTextRuns(stringItem.inner));
}

function parseThemeColors(xml: string): string[] {
  if (!xml) return [];
  const colorSchemeMatch = /<a:clrScheme\b[^>]*>([\s\S]*?)<\/a:clrScheme>/i.exec(xml);
  if (!colorSchemeMatch) return [];
  return THEME_COLOR_ORDER.map((name) => {
    const match = new RegExp(`<a:${name}\\b[^>]*>([\\s\\S]*?)<\\/a:${name}>`, "i").exec(
      colorSchemeMatch[1]
    );
    if (!match) return "";
    const srgb = /<a:srgbClr\b[^>]*val="([0-9A-Fa-f]{6})"/i.exec(match[1])?.[1];
    const systemColor = /<a:sysClr\b[^>]*lastClr="([0-9A-Fa-f]{6})"/i.exec(match[1])?.[1];
    return srgb ? `#${srgb.toUpperCase()}` : systemColor ? `#${systemColor.toUpperCase()}` : "";
  });
}

function parseStyles(xml: string, themeColors: string[]): CellFormatStyle[] {
  if (!xml) return [{}];

  const customNumberFormats = new Map<number, string>();
  const numberFormatsSection = firstInnerTag(xml, "numFmts");
  if (numberFormatsSection) {
    for (const numFmt of collectElementBlocks(numberFormatsSection, "numFmt")) {
      const id = toNumber(numFmt.attributes.numFmtId);
      const formatCode = numFmt.attributes.formatCode
        ? decodeXmlEntities(numFmt.attributes.formatCode)
        : undefined;
      if (id !== undefined && formatCode) {
        customNumberFormats.set(id, formatCode);
      }
    }
  }

  const fonts = parseFonts(firstInnerTag(xml, "fonts") ?? "", themeColors);
  const fills = parseFills(firstInnerTag(xml, "fills") ?? "", themeColors);
  const xfs = collectElementBlocks(firstInnerTag(xml, "cellXfs") ?? "", "xf");

  if (xfs.length === 0) return [{}];

  return xfs.map((xf) => {
    const font = fonts[toNumber(xf.attributes.fontId) ?? 0] ?? {};
    const fill = fills[toNumber(xf.attributes.fillId) ?? 0] ?? {};
    const numFmtId = toNumber(xf.attributes.numFmtId);
    const alignmentTag = firstTagAttributes(xf.inner, "alignment");
    const numberFormat =
      numFmtId !== undefined
        ? customNumberFormats.get(numFmtId) ?? BUILTIN_NUMBER_FORMATS[numFmtId]
        : undefined;

    return {
      ...font,
      ...fill,
      horizontalAlign: normalizeHorizontalAlignment(alignmentTag?.horizontal),
      verticalAlign: normalizeVerticalAlignment(alignmentTag?.vertical),
      wrapText: alignmentTag?.wrapText === "1",
      numberFormat,
      isDate: isDateNumberFormat(numberFormat, numFmtId),
    };
  });
}

function parseFonts(xml: string, themeColors: string[]): FontStyle[] {
  return collectElementBlocks(xml, "font").map((font) => ({
    bold: hasTruthyElement(font.inner, "b"),
    italic: hasTruthyElement(font.inner, "i"),
    underline: hasTruthyElement(font.inner, "u"),
    fontSize: toNumber(firstTagAttributes(font.inner, "sz")?.val),
    fontFamily: firstTagAttributes(font.inner, "name")?.val,
    color: resolveColor(firstTagAttributes(font.inner, "color"), themeColors),
  }));
}

function parseFills(xml: string, themeColors: string[]): FillStyle[] {
  return collectElementBlocks(xml, "fill").map((fill) => {
    const patternFill = firstTagBlock(fill.inner, "patternFill");
    if (!patternFill) return {};
    if (
      patternFill.attributes.patternType === "none" ||
      patternFill.attributes.patternType === "gray125"
    ) {
      return {};
    }

    return {
      backgroundColor:
        resolveColor(firstTagAttributes(patternFill.inner, "fgColor"), themeColors) ??
        resolveColor(firstTagAttributes(patternFill.inner, "bgColor"), themeColors),
    };
  });
}

function parseSheet(
  name: string,
  xml: string,
  sharedStrings: string[],
  styles: CellFormatStyle[],
  uses1904DateSystem: boolean
): SpreadsheetSheet {
  const cells: Record<string, SpreadsheetCell> = {};
  const columnWidths = parseColumnWidths(xml);
  let maxRow = 0;
  let maxColumn = 0;
  const sheetData = firstInnerTag(xml, "sheetData") ?? "";

  for (const rowBlock of collectElementBlocks(sheetData, "row")) {
    const rowNumber = toNumber(rowBlock.attributes.r);
    for (const cellBlock of collectElementBlocks(rowBlock.inner, "c")) {
      const ref = cellBlock.attributes.r;
      const coordinates = ref ? parseCellReference(ref) : null;
      if (!coordinates) continue;

      const style = styles[toNumber(cellBlock.attributes.s) ?? 0] ?? {};
      const value = resolveCellValue(
        cellBlock,
        style,
        sharedStrings,
        uses1904DateSystem
      );

      cells[`${coordinates.row}:${coordinates.column}`] = {
        ref,
        row: coordinates.row,
        column: coordinates.column,
        value,
        style: {
          bold: style.bold,
          italic: style.italic,
          underline: style.underline,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          color: style.color,
          backgroundColor: style.backgroundColor,
          horizontalAlign: style.horizontalAlign,
          verticalAlign: style.verticalAlign,
          wrapText: style.wrapText,
        },
      };

      maxRow = Math.max(maxRow, coordinates.row, rowNumber ?? 0);
      maxColumn = Math.max(maxColumn, coordinates.column);
    }
  }

  const dimension = parseDimension(xml);
  if (dimension) {
    maxRow = Math.max(maxRow, dimension.maxRow);
    maxColumn = Math.max(maxColumn, dimension.maxColumn);
  }

  return {
    name,
    maxRow,
    maxColumn,
    cells,
    columnWidths,
  };
}

function parseColumnWidths(xml: string): Record<number, number> {
  const widths: Record<number, number> = {};
  const columnsSection = firstInnerTag(xml, "cols");
  if (!columnsSection) return widths;

  for (const column of collectElementBlocks(columnsSection, "col")) {
    const min = toNumber(column.attributes.min);
    const max = toNumber(column.attributes.max);
    const width = toNumber(column.attributes.width);
    if (min === undefined || max === undefined || width === undefined) continue;

    const pixels = Math.max(72, Math.round(width * 7 + 12));
    for (let index = min; index <= max; index += 1) {
      widths[index] = pixels;
    }
  }

  return widths;
}

function resolveCellValue(
  cell: XmlBlock,
  style: CellFormatStyle,
  sharedStrings: string[],
  uses1904DateSystem: boolean
): string {
  const cellType = cell.attributes.t;
  const value = firstInnerTag(cell.inner, "v") ?? "";

  if (cellType === "inlineStr") return extractTextRuns(firstInnerTag(cell.inner, "is") ?? "");
  if (cellType === "s") {
    const index = toNumber(value);
    return index !== undefined ? sharedStrings[index] ?? "" : "";
  }
  if (cellType === "str") return decodeXmlEntities(value);
  if (cellType === "b") return value === "1" ? "TRUE" : "FALSE";
  if (cellType === "e") return value ? `#${value}` : "";
  if (style.isDate && value) {
    const serial = Number(value);
    if (!Number.isNaN(serial)) {
      return formatDateCell(serial, uses1904DateSystem, style.numberFormat);
    }
  }

  return decodeXmlEntities(value);
}

function formatDateCell(
  serial: number,
  uses1904DateSystem: boolean,
  numberFormat?: string
): string {
  const date = excelSerialToDate(serial, uses1904DateSystem);
  if (Number.isNaN(date.getTime())) return String(serial);

  const normalizedFormat = sanitizeNumberFormat(numberFormat);
  const hasDate = /[ymd]/i.test(normalizedFormat);
  const hasTime = /[hs]/i.test(normalizedFormat);
  const formatOptions = { timeZone: "UTC" as const };

  if (hasDate && hasTime) {
    return new Intl.DateTimeFormat(undefined, {
      ...formatOptions,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }
  if (hasTime) {
    return new Intl.DateTimeFormat(undefined, {
      ...formatOptions,
      timeStyle: "short",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    ...formatOptions,
    dateStyle: "medium",
  }).format(date);
}

function sanitizeNumberFormat(formatCode?: string): string {
  if (!formatCode) return "";
  return formatCode.replace(/"[^"]*"|\[[^\]]*]/g, "");
}

function isDateNumberFormat(formatCode?: string, numFmtId?: number): boolean {
  if (numFmtId !== undefined && BUILTIN_DATE_FORMAT_IDS.has(numFmtId)) return true;
  if (!formatCode) return false;
  return /[ymdhHs]/i.test(sanitizeNumberFormat(formatCode));
}

function normalizeHorizontalAlignment(
  alignment?: string
): SpreadsheetCellStyle["horizontalAlign"] | undefined {
  if (alignment === "left" || alignment === "center" || alignment === "right" || alignment === "justify") {
    return alignment;
  }
  return undefined;
}

function normalizeVerticalAlignment(
  alignment?: string
): SpreadsheetCellStyle["verticalAlign"] | undefined {
  if (alignment === "top" || alignment === "bottom") return alignment;
  if (alignment === "center") return "middle";
  return undefined;
}

function parseDimension(
  xml: string
): { maxRow: number; maxColumn: number } | null {
  const ref = firstTagAttributes(xml, "dimension")?.ref;
  if (!ref) return null;
  const match = /([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/i.exec(ref);
  if (!match) return null;
  return {
    maxRow: Number(match[4] ?? match[2]),
    maxColumn: columnNameToNumber(match[3] ?? match[1]),
  };
}

function parseCellReference(
  reference: string
): { row: number; column: number } | null {
  const match = /^([A-Z]+)(\d+)$/i.exec(reference);
  if (!match) return null;
  return {
    column: columnNameToNumber(match[1]),
    row: Number(match[2]),
  };
}

function columnNameToNumber(name: string): number {
  let value = 0;
  for (const char of name.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value;
}

function resolveColor(
  attributes: Record<string, string> | undefined,
  themeColors: string[]
): string | undefined {
  if (!attributes) return undefined;
  if (attributes.rgb) {
    return normalizeHexColor(attributes.rgb);
  }

  const themeIndex = toNumber(attributes.theme);
  if (themeIndex !== undefined) {
    const themeColor = themeColors[themeIndex];
    if (themeColor) {
      return applyTint(themeColor, Number(attributes.tint ?? "0"));
    }
  }

  const indexed = toNumber(attributes.indexed);
  if (indexed !== undefined) {
    return INDEXED_COLORS[indexed];
  }

  return undefined;
}

function normalizeHexColor(value: string): string | undefined {
  const normalized = value.replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(normalized)) return undefined;
  return `#${(normalized.length === 8 ? normalized.slice(2) : normalized).toUpperCase()}`;
}

function applyTint(color: string, tint: number): string {
  if (Number.isNaN(tint) || tint === 0) return color;

  const normalized = normalizeHexColor(color);
  if (!normalized) return color;
  const rgb = [1, 3, 5].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16)
  );
  const adjusted = rgb.map((channel) =>
    tint < 0
      ? Math.round(channel * (1 + tint))
      : Math.round(channel * (1 - tint) + 255 * tint)
  );
  return `#${adjusted
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function firstInnerTag(xml: string, tagName: string): string | undefined {
  return firstTagBlock(xml, tagName)?.inner;
}

function firstTagAttributes(
  xml: string,
  tagName: string
): Record<string, string> | undefined {
  return firstTagBlock(xml, tagName)?.attributes;
}

function firstTagBlock(xml: string, tagName: string): XmlBlock | undefined {
  return collectElementBlocks(xml, tagName)[0];
}

function collectElementBlocks(xml: string, tagName: string): XmlBlock[] {
  if (!xml) return [];

  const blocks: XmlBlock[] = [];
  const pattern = new RegExp(
    `<${tagName}\\b([^>]*?)(?:\\/\\s*>|>([\\s\\S]*?)<\\/${tagName}>)`,
    "gi"
  );

  let match = pattern.exec(xml);
  while (match) {
    blocks.push({
      attributes: parseAttributes(match[1] ?? ""),
      inner: match[2] ?? "",
    });
    match = pattern.exec(xml);
  }

  return blocks;
}

function parseAttributes(attributesSource: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  let match = pattern.exec(attributesSource);
  while (match) {
    attributes[match[1]] = decodeXmlEntities(match[2] ?? match[3] ?? "");
    match = pattern.exec(attributesSource);
  }

  return attributes;
}

function extractTextRuns(xml: string): string {
  const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
  let result = "";
  let match = textPattern.exec(xml);
  while (match) {
    result += decodeXmlEntities(match[1]);
    match = textPattern.exec(xml);
  }
  return result;
}

function hasTruthyElement(xml: string, tagName: string): boolean {
  const block = firstTagBlock(xml, tagName);
  if (!block) return false;
  return block.attributes.val !== "0" && block.attributes.val !== "false";
}

function decodeXmlEntities(value: string): string {
  return value.replace(
    /&(?:lt|gt|amp|quot|apos|#\d+|#x[0-9A-Fa-f]+);/g,
    (entity) => {
      switch (entity) {
        case "&lt;":
          return "<";
        case "&gt;":
          return ">";
        case "&amp;":
          return "&";
        case "&quot;":
          return '"';
        case "&apos;":
          return "'";
        default:
          if (entity.startsWith("&#x")) {
            return String.fromCodePoint(Number.parseInt(entity.slice(3, -1), 16));
          }
          return String.fromCodePoint(Number.parseInt(entity.slice(2, -1), 10));
      }
    }
  );
}

function toNumber(value?: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
