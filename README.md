# Teddy.js/PaintUp!

JavaScript Version of [Teddy](http://www-ui.is.s.u-tokyo.ac.jp/~takeo/teddy/teddy.htm) and a Demo Application for the library

## Teddy.js

The teddy.js allows you to build a 3D mesh from a 2D coutour. Briefly speaking, the mesh-buiding procedure is described below:

1. Triangulate a countour.
2. Retrieve a spine.
3. Re-triangulate based on the spine.
4. Raise polygons around the spine.

To know about the algorithm in detail, please see [the original paper](http://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf). 

Note that though the original teddy described in the paper realize some other operation than pumping a countour such as extrusion, cutting and so on, the teddy.js can only pump a 2D figure.

## PaintUp!

http://technohippy.github.io/teddyjs/

PaintUp! is a sample application utilizing teddy.js. You can:

- Build a 3D model from your 2D painging.
- Download a built 3D model in obj/stl format.
- Use this on your smartphone.

## Author

Ando Yasushi (andyjpn@gmail.com)
