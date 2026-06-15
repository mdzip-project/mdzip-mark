# The MDZip Mark

![MDZip Mark variants: closed and open, in light and dark](media/mdzip-mark-variants.png)


Use this mark to identify MDZip (.mdz) files, tools, and integrations.

The MDZip Mark combines a folder shape with the Markdown "M" and down arrow, connecting MDZip archives to their Markdown-based contents.

## History

This mark is based on the visual language of [The Markdown Mark](https://github.com/dcurtis/markdown-mark), designed by [Dustin Curtis](https://dustincurtis.com/) to identify Markdown support. MDZip uses the same recognizable "M" and down arrow as a reference point, then places it inside a folder form to represent Markdown packaged as an archive.

## Design

The mark is built as a simple, high-contrast folder icon so it remains readable at small sizes. The primary artwork is kept in SVG, with raster exports provided for application icons and file associations.

## Usage

Use the MDZip Mark anywhere MDZip support needs to be identified, such as file icons, application icons, documentation, or tool UI.

Please keep these guidelines in mind:

1. Maintain the original proportions of the folder, Markdown glyph, and arrow.
2. Prefer the supplied SVG, PNG, or ICO assets instead of redrawing the mark.
3. Use the square variants when a fixed-size app or file icon is needed.
4. Copy the assets into your own project rather than linking to them here. File names and folder layout may change, and raw GitHub URLs are rate-limited and not meant for hot-linking.

## Files

- `svg/` - editable SVG source files.
- `png/` - PNG exports. Non-square exports are indexed by height: `mdzip-mark-h<height>-<width>x<height>.png` (e.g. `mdzip-mark-h096-127x96.png`). The closed and open marks are rendered at the same set of heights, so a given `h<height>` always has a matching pair of equal height. Square exports use `mdzip-mark-square-<size>.png`.
- `ico/` - Windows icon exports.
- `*/dark/` - dark-mode (inverted) assets, mirrored inside each format folder.
- `media/` - composite images for documentation (not distributable marks).
- `reference/` - reference artwork used while designing the mark.

## Variants

- `mdzip-mark` - primary closed-folder mark.
- `mdzip-mark-open` - open-folder mark.
- `mdzip-mark-square` - square-framed primary mark.
- `mdzip-mark-open-square` - square-framed open-folder mark.

Each variant also ships a dark-mode version with black and white inverted, for use on dark backgrounds. Dark assets live in a `dark/` subfolder within each format directory and carry a `-dark` suffix (e.g. `svg/dark/mdzip-mark-dark.svg`), so a file stays self-describing even after it is copied out of this repo.

## License

The MDZip Mark is dedicated to the public domain under [CC0 1.0 Universal](LICENSE).

CC0 covers copyright in these assets. It does not grant trademark rights in the MDZip name or branding.
