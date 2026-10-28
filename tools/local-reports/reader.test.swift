import AppKit
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let root = CommandLine.arguments.count > 1
    ? URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
    : FileManager.default.temporaryDirectory.appendingPathComponent("saivie-reader-test-\(UUID().uuidString)", isDirectory: true)
try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
let keepFixtures = CommandLine.arguments.count > 1
defer { if !keepFixtures { try? FileManager.default.removeItem(at: root) } }

func drawText(_ context: CGContext) {
    let lines = ["SYNTHETIC LAB REPORT", "Patient: Synthetic Patient", "Date: 2026-10-28", "TSH <0.01 mIU/L", "Hb 12.5 g/dL"]
    context.setFillColor(NSColor.black.cgColor)
    for (index, line) in lines.enumerated() {
        context.textPosition = CGPoint(x: 70, y: 900 - index * 100)
        let text = NSAttributedString(string: line, attributes: [
            NSAttributedString.Key(kCTFontAttributeName as String): CTFontCreateWithName("Helvetica" as CFString, 42, nil),
            NSAttributedString.Key(kCTForegroundColorAttributeName as String): NSColor.black.cgColor
        ])
        CTLineDraw(CTLineCreateWithAttributedString(text), context)
    }
}

let space = CGColorSpaceCreateDeviceRGB()
let bitmap = CGContext(data: nil, width: 1400, height: 1100, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
bitmap.setFillColor(NSColor.white.cgColor)
bitmap.fill(CGRect(x: 0, y: 0, width: 1400, height: 1100))
drawText(bitmap)
let image = bitmap.makeImage()!
let imageURL = root.appendingPathComponent("synthetic-lab.png")
let destination = CGImageDestinationCreateWithURL(imageURL as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, image, nil)
assert(CGImageDestinationFinalize(destination))

func makePDF(_ name: String, _ pageCount: Int, scanned: Bool) {
    var bounds = CGRect(x: 0, y: 0, width: 1400, height: 1100)
    let context = CGContext(root.appendingPathComponent(name) as CFURL, mediaBox: &bounds, nil)!
    for _ in 0..<pageCount {
        context.beginPDFPage(nil)
        if scanned { context.draw(image, in: bounds) } else { drawText(context) }
        context.endPDFPage()
    }
    context.closePDF()
}
makePDF("embedded.pdf", 2, scanned: false)
makePDF("scanned.pdf", 2, scanned: true)
makePDF("too-many-pages.pdf", 11, scanned: false)
let blank = root.appendingPathComponent("blank.png")
let blankBitmap = CGContext(data: nil, width: 100, height: 100, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let blankDestination = CGImageDestinationCreateWithURL(blank as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(blankDestination, blankBitmap.makeImage()!, nil)
assert(CGImageDestinationFinalize(blankDestination))

func read(_ name: String, succeeds: Bool) throws -> [[String: Any]] {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/swift")
    process.arguments = ["tools/local-reports/read-document.swift", root.appendingPathComponent(name).path]
    let output = Pipe()
    process.standardOutput = output
    let errors = Pipe()
    process.standardError = errors
    try process.run()
    let data = output.fileHandleForReading.readDataToEndOfFile()
    process.waitUntilExit()
    assert((process.terminationStatus == 0) == succeeds, "\(name): unexpected OCR result")
    if !succeeds { return [] }
    return try JSONSerialization.jsonObject(with: data) as! [[String: Any]]
}

let imagePages = try read("synthetic-lab.png", succeeds: true)
assert(imagePages.count == 1)
assert((imagePages[0]["text"] as! String).contains("12.5"))
for file in ["embedded.pdf", "scanned.pdf"] {
    let pages = try read(file, succeeds: true)
    assert(pages.count == 2)
    assert(pages[1]["pageNumber"] as! Int == 2)
    assert((pages[0]["text"] as! String).contains("TSH"))
}
_ = try read("too-many-pages.pdf", succeeds: false)
_ = try read("blank.png", succeeds: false)
print("PASS: synthetic image, embedded PDF, scanned PDF, page limit, and blank-page rejection.")
if keepFixtures { print("Synthetic fixtures: \(root.path)") }
