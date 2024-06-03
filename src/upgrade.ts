#!/usr/bin/env node

/**
 * @autor kida7
 */

import { exec, Version } from "./utils";
import path from "path";
import fs from "fs";
import fse from "fs-extra";
import chalk from "chalk";
import { ArgumentParser } from "argparse";
import "./string";

const parser = new ArgumentParser({
  addHelp: true,
  description: "React Native upgrade tool using rn-diff-purge",
});

parser.addArgument(["--source", "-s"], {
  help: "Project folder path, default current folder",
  dest: "source",
  type: "string",
});

parser.addArgument(["--apply-for", "-a"], {
  help: "Apply only for a specific folder",
  dest: "applyFor",
  type: "string",
});

parser.addArgument(["--version", "-v"], {
  help: "Specific version to upgrade/downgrade",
  dest: "version",
  type: "string",
});

parser.addArgument(["--diff", "-d"], {
  help: "Specific diff file (with rn-diff-purge repo) to patch (--version/-v option will be ignore",
  dest: "diff",
  type: "string",
});

parser.addArgument(["--test", "-t"], {
  help: "If true, there is no file change",
  dest: "test",
  type: "string",
  metavar: "",
});

parser.addArgument(["--save"], {
  help: "Save output to file",
  dest: "save",
  type: "string",
  metavar: "",
});

const args = parser.parseArgs();

const isTestMode = args.test;
const writeFile = isTestMode ? () => {} : fse.outputFileSync;
const sourceFolder = args.source || ".";
const rootFolder = path.relative(".", sourceFolder);
const newVersion = args.v || args.version;
const saveFilePath = args.save;
const applyForRegex = args.applyFor && new RegExp(args.applyFor as string);

const filesWithConflicts: { [key: string]: string[] } = {};

(async function main() {
  function convertToCamelCase(text: string) {
    return text
      .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())
      .replace(/^./, (match) => match.toUpperCase());
  }
  console.log({ sourceFolder });
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(rootFolder, "package.json"), "utf-8")
    );

    const projectName = packageJson.name;

    if (!packageJson.dependencies["react-native"]) {
      console.log("Could not find react native project");
      return;
    }

    const currentVersion = packageJson.dependencies["react-native"].replace(
      /[^\d\.-\w]/g,
      ""
    );

    const diffUrl =
      args.diff ||
      `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/${currentVersion}..${newVersion}.diff`;

    const androidManifestPath = path.join(
      rootFolder,
      "android/app/src/main/AndroidManifest.xml"
    );

    const androidManifest = fs.readFileSync(androidManifestPath, {
      encoding: "utf-8",
    });

    //@ts-ignore
    const androidPackageName = androidManifest.match(/package="(.+?)"/)[1];

    const iosPackageName = convertToCamelCase(projectName);

    const diffContent = diffUrl.match(/http/)
      ? await exec(`curl ${diffUrl}`, null, true)
      : fs.readFileSync(diffUrl, "utf-8");

    if (!diffContent.startsWith("diff")) {
      console.log("There was an unexpected error with the version you choosed");
      return;
    }

    const updatedDiffContent =
      "\n" +
      diffContent
        .replace(/\W[ab]\/RnDiffApp\//g, (match) =>
          match.replace(/(\W[ab]\/)RnDiffApp\//, "$1")
        )
        .replace(/ios\/RnDiffApp/g, "ios/" + iosPackageName)
        .replace(/com\.rndiffapp/g, androidPackageName)
        .replace(/com\/rndiffapp/g, androidPackageName.replace(/\./g, "/"))
        .replace(/RnDiffApp/g, projectName);

    if (isTestMode) {
      console.log(__dirname);
      fse.outputFileSync(
        path.join(rootFolder, "diff.diff"),
        updatedDiffContent
      );
    }

    const changeBlocks = updatedDiffContent
      .split(/\ndiff --git a\/.+ b\/.+\n/)
      .slice(1);

    const allDiffs =
      updatedDiffContent.match(/\ndiff --git a\/.+ b\/.+\n/g) || [];
    const noPatchFiles: string[] = [];

    for (let i = 0; i < changeBlocks.length; i++) {
      await applyPatch(changeBlocks[i], allDiffs[i]);
    }
  } catch (ex: any) {
    console.log(chalk.red(ex.message), "\n");
  }
})();

function applyPatchBlock(
  fileContent: string,
  blockContent: string,
  depth: number,
  filePath: string
): string | null {
  let blockLines = blockContent.split("\n");
  // if (!depth)
  //   blockLines = blockLines
  //     .filter((line) => !line.match(/^\\/))
  //     .map((line) => line.replace(/^ /g, ""));

  const originalContent = blockLines
    .filter((line) => !line.match(/^[\+]/))
    .map((line) => line.replace(/^[-\s]/, ""))
    .join("\n");

  const patchedContent = blockLines
    .filter((line) => !line.match(/^[-]/))
    .map((line) => line.replace(/^[\+\s]/, ""))
    .join("\n");

  const regexPattern = originalContent
    .toRegex("i", true)
    //@ts-ignore
    .replace(/\d+/g, "\\d+");

  if (!fileContent.match(new RegExp(regexPattern, "m"))) {
    let result = null;
    if (!blockLines[0].match(/^[+-]/))
      result = applyPatchBlock(
        fileContent,
        blockLines.slice(1).join("\n"),
        depth + 1,
        filePath
      );
    else if (!blockLines[blockLines.length - 1].match(/^[+-]/))
      result = applyPatchBlock(
        fileContent,
        blockLines.slice(0, blockLines.length - 1).join("\n"),
        depth + 1,
        filePath
      );

    if (!result && !depth) {
      const coloredBlock = blockLines
        .map((line) => {
          return line.replace(/^[\+-\s].*$/g, (match) => {
            const matchParts = match.match(/^([\+-\s])(.*)$/);
            //@ts-ignore
            switch (matchParts[1]) {
              case "+":
                //@ts-ignore
                return chalk.green(matchParts[2]);
              case "-":
                //@ts-ignore
                return chalk.red(matchParts[2]);
              default:
                //@ts-ignore
                return matchParts[2];
            }
          });
        })
        .join("\n");

      if (!filesWithConflicts[filePath]) filesWithConflicts[filePath] = [];
      filesWithConflicts[filePath].push(coloredBlock);
    }
    return result;
  }
  return fileContent.replace(new RegExp(regexPattern), patchedContent);
}

async function applyPatch(changeContent: string, diff: string) {
  const match = diff.match(/diff --git a\/(.+) b\/(.+)/);
  //@ts-ignore
  const sourceFile = match[1];
  //@ts-ignore
  const destinationFile = match[2];

  if (applyForRegex && !applyForRegex.test(destinationFile)) {
    console.log("Skip {0}".format(destinationFile));
    return;
  }

  let fileMode = "";
  try {
    if (changeContent.match(/GIT binary patch/)) {
      fileMode = "PATCH BINARY";
      const link = `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/version/${newVersion}/RnDiffApp/${destinationFile}`;
      console.log(
        `${chalk.yellow("Download")} ${chalk.blue(link)} to ${chalk.green(
          destinationFile
        )}`
      );
      if (newVersion && !isTestMode)
        await exec(`curl ${link} -o ${path.join(rootFolder, destinationFile)}`);
      return;
    }

    if (changeContent.startsWith("deleted file mode")) {
      fileMode = "DELETE";
      console.log(chalk.red("Delete file:"), chalk.green(sourceFile));
      if (!isTestMode) exec(`rm -rf ${path.join(rootFolder, sourceFile)}`);
      return;
    }

    const patches = changeContent.split(/\n@@.+?@@\n?/).slice(1);

    if (changeContent.startsWith("new file mode")) {
      fileMode = "NEW";
      console.log(chalk.blue("Create new file:"), chalk.green(destinationFile));
      const content = patches[0]
        .split("\n")
        .map((line) => line.replace(/^\+/g, ""))
        .join("\n");
      writeFile(path.join(rootFolder, destinationFile), content);
      return;
    }

    fileMode = "PATCH";
    let fileContent = fs.readFileSync(
      path.join(rootFolder, sourceFile),
      "utf-8"
    );
    let appliedPatchCount = 0;

    patches.forEach((patch) => {
      const newContent = applyPatchBlock(fileContent, patch, 0, sourceFile);
      if (newContent) {
        appliedPatchCount++;
        fileContent = newContent;
      }
    });

    writeFile(path.join(rootFolder, destinationFile), fileContent);
    console.log(
      chalk
        .yellow(
          `Apply ${chalk.blue("{0}/{1}")} patches on file: ${chalk.green(
            "{2}"
          )}`
        )
        .format(appliedPatchCount, patches.length, sourceFile)
    );

    if (appliedPatchCount < patches.length) {
      console.log(chalk.redBright("Conflict:"));
      console.log(
        chalk.gray(
          filesWithConflicts[sourceFile].join(chalk.redBright("\nConflict:\n"))
        )
      );
    }
  } catch (ex: any) {
    console.log(ex);
    console.log(chalk.red(fileMode));
    console.log(ex.message);
    switch (ex.code) {
      case "ENOENT":
        break;
      default:
        console.log(chalk.grey(changeContent));
        break;
    }
  }
}
