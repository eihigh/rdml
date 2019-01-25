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

  interface unit {
    desc: string;
    baseType: baseType;
  }

  const units: { [name: string]: unit } = {
    id: {
      desc: "ID",
      baseType: new baseTypes.Int(0, null, 0),
    },
    idBased1: {
      desc: "1以上のID",
      baseType: new baseTypes.Int(1, null, 1),
    },
    time: {
      desc: "フレーム数",
      baseType: new baseTypes.Int(0, null, 60),
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
