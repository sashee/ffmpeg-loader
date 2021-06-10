# WebPack loader to run arbitrary filters for audio files

It requires ffmpeg to be installed

## Install

```
npm i ffmpeg-loader
```

## Use

In the WebPack config, add the loader and configure the filters:

```
{
  test: /\.wav$/,
  use: [
    {
      loader: require.resolve('file-loader'),
    },
    {
      loader: "ffmpeg-loader",
      options: {
        filters: "-af adeclick,afftdn=nr=80:nf=-20:nt=w:om=o,highpass=f=70"
      }
    },
  ],
},
```

Note that the loader gets an audio file and outputs the wav directly without emitting files. **It is intended to be used with other loaders** that write the audio and emit it. (such as the file-loader)

## Configuration

You can set 1 value:

* ```filters```: This is what goes in between the input and the output: ```ffmpeg -i <file> <filters> <outfile>```
