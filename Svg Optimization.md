Elements:
=> g, path, [polygon, polyline], ellipse, circle


SVG Path - `<path>` <br>
The `<path>` element is used to define a path.

The following commands are available for path data:

- M = moveto
- L = lineto
- H = horizontal lineto
- V = vertical lineto
- C = curveto
- S = smooth curveto
- Q = quadratic Bézier curve
- T = smooth quadratic Bézier curveto
- A = elliptical Arc
- Z = closepath

Character Set:
m/M, l/L, h/H, v/V, c/C, s/S, q/Q, t/t, a/A, z/Z, '.', ',', '-', ' ', 0-9
=> 10 (Numbers) + 20 (CMD) + 4 (SPECIAL CHARACTERS) = 34

Polygon:
=> Float points

Algorithmus:

1. Sammel alle Element als JSON: `{el: string, attr: { [t:string]: string }, c: Elements[] }`
2. Decompress attributes
3. Minify JS