import AppKit
import Foundation
import ImageIO
import PDFKit
import Vision

struct SourcePage: Codable {
    let pageNumber: Int
    let text: String
}

enum ReadError: Error {
    case invalid(String)
}

func recognize(_ image: CGImage) throws -> String {
    guard image.width * image.height <= 20_000_000 else {
        throw ReadError.invalid("Image exceeds 20 megapixels.")
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.automaticallyDetectsLanguage = true
    try VNImageRequestHandler(cgImage: image).perform([request])
    return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
}

func readDocument(_ url: URL) throws -> [SourcePage] {
    let data = try Data(contentsOf: url)
    guard !data.isEmpty, data.count <= 10 * 1024 * 1024 else {
        throw ReadError.invalid("File must be nonempty and at most 10MB.")
    }
    var pages: [SourcePage] = []
    if data.starts(with: Data("%PDF-".utf8)) {
        guard let pdf = PDFDocument(data: data), !pdf.isLocked, (1...10).contains(pdf.pageCount) else {
            throw ReadError.invalid("PDF must be readable, unlocked, and contain at most 10 pages.")
        }
        for index in 0..<pdf.pageCount {
            guard let page = pdf.page(at: index) else { throw ReadError.invalid("Missing PDF page.") }
            let embedded = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let text: String
            if embedded.count >= 20 {
                text = embedded
            } else {
                let bounds = page.bounds(for: .mediaBox)
                guard bounds.width > 0, bounds.height > 0 else { throw ReadError.invalid("Invalid PDF page.") }
                let scale = min(200.0 / 72.0, 3500.0 / max(bounds.width, bounds.height))
                let thumbnail = page.thumbnail(of: NSSize(width: bounds.width * scale, height: bounds.height * scale), for: .mediaBox)
                guard let image = thumbnail.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
                    throw ReadError.invalid("Cannot render PDF page.")
                }
                text = try recognize(image)
            }
            guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw ReadError.invalid("A page returned no text. No partial extraction will be accepted.")
            }
            pages.append(SourcePage(pageNumber: index + 1, text: text))
        }
    } else {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              CGImageSourceGetCount(source) == 1,
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int,
              width > 0, height > 0, width * height <= 20_000_000,
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            throw ReadError.invalid("Upload a single-frame image of at most 20 megapixels.")
        }
        let orientationValue = properties[kCGImagePropertyOrientation] as? UInt32 ?? 1
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.automaticallyDetectsLanguage = true
        try VNImageRequestHandler(cgImage: image, orientation: CGImagePropertyOrientation(rawValue: orientationValue) ?? .up).perform([request])
        let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw ReadError.invalid("No readable text.") }
        pages.append(SourcePage(pageNumber: 1, text: text))
    }
    guard pages.reduce(0, { $0 + $1.text.count }) <= 99_000 else { throw ReadError.invalid("Too much text. Split the report.") }
    return pages
}

do {
    guard CommandLine.arguments.count == 2 else { throw ReadError.invalid("Usage: read-document.swift FILE") }
    let pages = try readDocument(URL(fileURLWithPath: CommandLine.arguments[1]))
    let output = try JSONEncoder().encode(pages)
    FileHandle.standardOutput.write(output)
} catch ReadError.invalid(let message) {
    FileHandle.standardError.write(Data("\(message)\n".utf8))
    exit(1)
} catch {
    FileHandle.standardError.write(Data("Local OCR failed. Check file readability and macOS developer tools.\n".utf8))
    exit(1)
}
