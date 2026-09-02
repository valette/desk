# DESK - Desktop Exposing Server Kit

[![npm version](https://badge.fury.io/js/desk-base.svg)](https://badge.fury.io/js/desk-base)
[![License](https://img.shields.io/badge/License-CECILL--B-blue.svg)](LICENSE)

<p align="center">
  <img src="https://www.creatis.insa-lyon.fr/~valette/public/project/desk/featured_hub9df65f39462830ba627a3faff4f1e76_507899_85c5251d48138f2badd397219e873e59.webp">
</p>


DESK is a remote desktop environment, originally developed for visualization and processing of medical images. It currently works under Linux or macOS, but patches for other platforms are welcome.

This repository contains the Node.js server component. The frontend UI source code is available at: [https://github.com/valette/desk-ui](https://github.com/valette/desk-ui)

## Features

- **Web-based IDE**: Full development environment accessible through any modern browser
- **3D Visualization**: Integration with THREE.js and qooxdoo for advanced 3D rendering
- **Command-line Tools**: Execute server-side programs through a web interface
- **Remote Terminal**: Web-based terminal access with full PTY support
- **Action Framework**: Register command-line tools as reusable actions
- **File Management**: Upload/download files and manage directories
- **Real-time Collaboration**: Live updates and communication through WebSockets

## Custom Remote Procedure Call definitions
DESK is just a server framework. Custom code execution is defined via actions definitions, which syntax should follow the desk-base module. More information here : [https://github.com/valette/desk-base](https://github.com/valette/desk-base)


## Local Versions

Two local versions are also available for running on your computer:
* [desk-electron](https://github.com/valette/desk-electron) - Desktop application using Electron
* [desk-nw](https://github.com/valette/desk-nw) - Desktop application using NW.js

## Goals

The primary goal is to enable efficient visualization tools such as THREE.js and qooxdoo on top of existing server-side command-line programs.

Each server-side program is registered as an 'action' using a JSON configuration file. See the ACVD.json file in the [ACVD repository](https://github.com/valette/ACVD) as an example.

DESK can also generate static content suitable for web deployment. An example of static content served by a classic Apache server is visible [here](http://www.creatis.insa-lyon.fr/~valette/200).

## Live Demo

A live demo is available at: [https://desk.creatis.insa-lyon.fr/demo/](https://desk.creatis.insa-lyon.fr/demo/)

More information: [http://www.creatis.insa-lyon.fr/~valette/desk.html](http://www.creatis.insa-lyon.fr/~valette/desk.html)

## License

CeCILL-B (BSD-compatible). For academic use, please cite:

H. Jacinto, R. Kéchichan, M. Desvignes, R. Prost, and S. Valette, "A Web Interface for 3D Visualization and Interactive Segmentation of Medical Images", 17th International Conference on 3D Web Technology (Web 3D 2012), Los Angeles, USA, pp. 51-58, 2012

// The desk-base library doesn't have a start() method.
// It's meant to be used as a module that exports action execution functions.
// The actual server is started by the parent application.


## Action Definitions

Actions are defined through JSON configuration files. These files describe executable commands or JavaScript modules along with their parameters. Actions are loaded from:

- `lib/includes/base.json` - Base system actions
- `lib/includes/testing/testing.json` - Test actions
- User-defined files in the extensions directory

For detailed information about all base actions and their parameters, please refer to the desk-base module : [https://github.com/valette/desk-base](https://github.com/valette/desk-base)

### Example Action Configuration

For a practical example of action definitions in use, see the [ACVD.json](https://github.com/valette/ACVD/blob/master/ACVD.json) file from the ACVD project, which demonstrates how to define complex mesh processing actions.

### Action Definition Structure

Each action definition has the following fields:

```json
{
  "parameters": [
    {
      "name": "parameter_name",
      "type": "parameter_type",
      "required": true,
      "defaultValue": "default_value",
      "prefix": "--option ",
      "suffix": " postfix",
      "min": 0,
      "max": 100
    }
  ],
  "command": "command_to_execute",
  "executable": "/path/to/executable",
  "js": "module_name",
  "voidAction": true,
  "noCache": true,
  "dependencies": ["dependency1", "dependency2"],
  "permissions": 1
}
```

### Parameter Types

| Type | Description |
|------|-------------|
| `string` | Simple string parameter |
| `int` | Integer value |
| `float` | Floating-point number |
| `file` | File path parameter |
| `directory` | Directory path parameter |
| `fileArray` | Array of file paths |
| `intArray` | Array of integers |
| `floatArray` | Array of floating-point numbers |
| `stringArray` | Array of strings |
| `base64data` | Base64 encoded binary data |
| `flag` | Boolean flag parameter |

## Requirements

To install DESK on your computer:
- Git
- Node.js (version 8.0.0 or higher)

For 3D data visualization (meshes, volumes):
- VTK with headers
- CMake

## Installation

```bash
git clone https://github.com/valette/desk.git
cd desk
npm install
```

To install binary addons for 3D data visualization (requires VTK and CMake):

```bash
npm run buildAddons
```

## Usage

```bash
node desk.js
```

Then point your browser to [http://localhost:8080](http://localhost:8080)

Default login:
- Username: your Linux username
- Password: "password"

## Development

Building the debug version:

```bash
cd node_modules/desk-ui
git clone https://github.com/qooxdoo/qooxdoo
npm install
npm run build
```

The debug version will be available at: [http://localhost:8080/ui/source](http://localhost:8080/ui/source)

## Acknowledgements

This software benefits from several open-source contributions:
* [VTK](http://www.vtk.org/)
* [Node.js](http://www.nodejs.org/)
* [THREE.js](http://www.threejs.org/)
* [qooxdoo](http://www.qooxdoo.org/)
* [OpenCTM](http://openctm.sourceforge.net/)
* [ACVD](http://github.com/valette/ACVD.git)
