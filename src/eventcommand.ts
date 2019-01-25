/// <reference path="rdml.ts" />
/// <reference path="parser.ts" />

namespace rdml {

  interface baseType {
    convert: (s: string | null) => Param; // validate and convert here
  }

  namespace baseTypes {
    export class Int {
      constructor(
        public min: number | null,
        public max: number | null,
        public def: number | null,
      ) { }

      convert(s: string | null): Param {
        if (s !== null) {
          return parseInt(s);
        }
        return 0;
      }
    }
  }

  interface Converter {
    convert: (src: string) => Param;
  }

  namespace conv {
    export class Fixed {
      constructor(private param: Param) { }
      convert(src: string) { return this.param; }
    }

    export class Int {
      constructor(
        private min: number,
        private max: number,
      ) { }
      convert(src: string) { return parseInt(src); }
    }

    export class Match {
      constructor(private cases: { [name: string]: Converter }) { }
      convert(src: string) {
        if (src in this.cases) {
          return this.cases[src].convert("");
        }
        return this.cases[""].convert(src);
      }
    }
  }

  interface unit {
    desc: string;
    converter: Converter;
  }

  const units: { [name: string]: unit } = {
    id: {
      desc: "ID",
      converter: new conv.Int(0, 10),
    },
    idBased1: {
      desc: "1以上のID",
      converter: new conv.Match({
        "all": new conv.Fixed(-2),
        "": new conv.Int(1, 10),
      }),
    },
    time: {
      desc: "フレーム数",
      converter: new conv.Int(0, 100),
    },
  }

  const hogeCmd = {
    __alts: ["fuga"],
    __dataAttr: "type",

    rdmlParams: {
      "type": {
        unit: units.id,
        desc: "hoge実行タイプ",
      },
      time: {
        unit: units.time,
        desc: "hoge実行フレーム数",
      },
    },

    tkoolParams: {
      0: { ref: "type" },
      1: { ref: "time" },
      2: { ref: "scale", index: 0 },
    }
  }

  // converting mock
  function hoge() {
    const el = new Element();
    const cmd = hogeCmd;
    const ps = cmd.rdmlParams;
    const attr = el.attrs["type"]; // oops.
    const out = ps["type"].unit.baseType.convert(attr);
    // ここで一旦キー=>パラメータのオブジェクトに詰める
    // その後tkoolParamsに詰め替える
  }
}
