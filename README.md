# Teddy.js/PaintUp

JavaScript Version of [Teddy](http://www-ui.is.s.u-tokyo.ac.jp/~takeo/teddy/teddy.htm) and a Demo Application for the library

## Teddy.js

![Countour to Mesh](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPallzc2F4bGdOX2s)

The teddy.js allows you to build a 4D mesh from a 2D coutour. Briefly speaking, the mesh-buiding procedure is described below:

1. Triangulate a countour.
2. Retrieve a spine.
3. Re-triangulate based on the spine.
4. Raise polygons around the spine.

To know about the algorithm in detail, please see [the original paper](http://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf). 

Note that though the original teddy described in the paper realize some other operation than pumping a countour such as extrusion, cutting and so on, the teddy.js can only pump a 2D figure.

## PaintUp

https://technohippy.github.io/teddyjs/

![countour](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPanhUUDN6UFNqbUE)
![pump](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPU0wyUTB1cnBYTXc)
![mesh](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPc0w1QUg4OVRzb00)

PaintUp is a sample application utilizing teddy.js. You can:

- Build a 3D model from your 2D painting.
- Download a built 3D model in obj/stl format.
- Use this on your smartphone.

### How to Use

I believe you can use this app without any explanation. When you do something then the ``3D'' button appears. Just click the button and wait a while.

### How to Install

If you are using Chrome for Android, you can use the web app like a native app by touching ``Add to home screen'' menu on your chrome browser. The term native app here means:

- The application icon exists on the home screen.
- The application can be used without any address bar.

Additionally if the day comes where a Chrome for Android suppots Service Workers, this app can work off line.

## Author

Ando Yasushi (andyjpn@gmail.com)
