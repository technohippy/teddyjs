# Teddy.js/PaintUp

JavaScript Version of [Teddy](http://www-ui.is.s.u-tokyo.ac.jp/~takeo/teddy/teddy.htm) and a Demo Application for the library

## Teddy.js

![Countour to Mesh](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPallzc2F4bGdOX2s)

The teddy.js allows you to build a 3D mesh from a 2D coutour. Briefly speaking, the mesh-buiding procedure is described below:

1. Triangulate a countour.
2. Retrieve a spine.
3. Re-triangulate based on the spine.
4. Raise polygons around the spine.

To know about the algorithm in detail, please see [the original paper](http://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf). 

Note that though the original teddy described in the paper realizes some other operation than pumping a countour such as extrusion, cutting and so on, the teddy.js can only pump a 2D figure.

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

Paint ![pen](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPdGhQTTNrY1Bydmc) or cut ![scissor](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPc0dmcEVfVmtwY00) the canvas then push 3D button ![3d](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPRGR4ZHZJT0txWlU). That's all you should do to build a 3D model.

### How to Install

If you are using Chrome for Android, you can use the web app like a native app by using "Add to home screen" menu.

![homescreen](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPR3RPdVl1c3FVN28)

The term "like a native app" here means:

- The application icon exists on the home screen.
- The application can be used without any address bar.
- The application can be used off line if the day comes where a Chrome for Android suppots Service Workers.

![icon](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPT3l1SmdNTl9nN2s)
![withoutaddress](http://drive.google.com/uc?export=view&id=0B2NukcLXuVBPM1phVy1mRHkxaUU)

## Author

Ando Yasushi (andyjpn@gmail.com)
