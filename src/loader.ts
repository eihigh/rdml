/// <reference path="event.ts" />

namespace rdml {

  export function load(paths: string[]) {
    for (const path of paths) {
      if (!(path in files)) {
        files[path] = new File(path);
      }
    }
  }

  export function hasLoaded() {
    let loaded = true;
    for (const path in files) {
      const file = files[path];
      loaded = loaded && file.loaded;
    }
    return loaded;
  }

  let files: { [path: string]: File } = {};

  class File {
    xhr: XMLHttpRequest = new XMLHttpRequest();
    loaded: boolean = false;

    constructor(private path: string) {
      const fullpath = "rdml/" + path;
      this.xhr.open("GET", fullpath);
      this.xhr.onload = () => {
        if (this.xhr.status < 400) {
          this.onload();
          this.loaded = true;
        }
      };
      this.xhr.send();
    }

    onload() {
      const nodes: Node[] = [];

      for (const node of nodes) {
        if (typeof node === "string") { continue; }

        const el: Element = node;
        if (el.name === "package") {
          const pname = el.attrs["name"];
          for (const child of el.children) {
            this.make(pname, child);
          }
        } else {
          this.make("", el);
        }
      }
    }

    make(pname: string, el: Element) {
      switch (el.name) {
        case "proc":
          makeProc(el);
          break;
      }
    }
  }
}
