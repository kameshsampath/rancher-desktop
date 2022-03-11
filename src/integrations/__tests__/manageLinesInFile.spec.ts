import fs from 'fs';
import os from 'os';
import path from 'path';
import manageLinesInFile, { START_LINE, END_LINE } from '@/integrations/manageLinesInFile';

const FILE_NAME = 'fakercfile';
const TEST_LINE_1 = 'this is test line 1';
const TEST_LINE_2 = 'this is test line 2';

let testDir = '';
let rcFilePath = '';

beforeEach(async() => {
  testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rdtest-'));
  rcFilePath = path.join(testDir, FILE_NAME);
});

afterEach(async() => {
  await fs.promises.rm(testDir, { recursive: true, force: true });
});

test("Create file when true and it doesn't yet exist", async() => {
  await manageLinesInFile(rcFilePath, [TEST_LINE_1], true);
  const content = await fs.promises.readFile(rcFilePath, 'utf8');
  const expectedContents = `${ START_LINE }
${ TEST_LINE_1 }
${ END_LINE }`;

  expect(content).toBe(expectedContents);
});

test('Delete file when false and it contains only the managed lines', async() => {
  const data = `${ START_LINE }
${ TEST_LINE_1 }
${ END_LINE }`;

  await fs.promises.writeFile(rcFilePath, data, { mode: 0o644 });
  await manageLinesInFile(rcFilePath, [], false);
  expect(fs.promises.readFile(rcFilePath, 'utf8')).rejects.toHaveProperty('code', 'ENOENT');
});

test('Put lines in file that exists and has content', async() => {
  const data = 'this is already present in the file\n';

  await fs.promises.writeFile(rcFilePath, data, { mode: 0o644 });
  await manageLinesInFile(rcFilePath, [TEST_LINE_1], true);
  const content = await fs.promises.readFile(rcFilePath, 'utf8');
  const expectedContents = `${ data }
${ START_LINE }
${ TEST_LINE_1 }
${ END_LINE }`;

  expect(content).toBe(expectedContents);
});

test('Remove lines from file that exists and has content', async() => {
  const unmanagedContents = 'this is already present in the file\n';
  const contents = `${ unmanagedContents }
${ START_LINE }
${ TEST_LINE_1 }
${ END_LINE }`;

  await fs.promises.writeFile(rcFilePath, contents, { mode: 0o644 });
  await manageLinesInFile(rcFilePath, [], false);
  const newContents = await fs.promises.readFile(rcFilePath, 'utf8');

  expect(newContents).toBe(unmanagedContents);
});

test('Update managed lines', async() => {
  const topUnmanagedContents = 'this is at the top of the file\n';
  const bottomUnmanagedContents = 'this is at the bottom of the file\n';
  const contents = `${ topUnmanagedContents }
${ START_LINE }
${ TEST_LINE_1 }
${ END_LINE }
${ bottomUnmanagedContents }`;

  await fs.promises.writeFile(rcFilePath, contents, { mode: 0o644 });
  await manageLinesInFile(rcFilePath, [TEST_LINE_1, TEST_LINE_2], true);
  const newContents = await fs.promises.readFile(rcFilePath, 'utf8');
  const expectedNewContents = `${ topUnmanagedContents }
${ START_LINE }
${ TEST_LINE_1 }
${ TEST_LINE_2 }
${ END_LINE }
${ bottomUnmanagedContents }`;

  expect(newContents).toBe(expectedNewContents);
});

test('Remove managed lines from between unmanaged lines', async() => {
  const topUnmanagedContents = 'this is at the top of the file\n';
  const bottomUnmanagedContents = 'this is at the bottom of the file\n';
  const contents = `${ topUnmanagedContents }
${ START_LINE }
${ TEST_LINE_1 }
${ END_LINE }
${ bottomUnmanagedContents }`;

  await fs.promises.writeFile(rcFilePath, contents, { mode: 0o644 });
  await manageLinesInFile(rcFilePath, [], false);
  const newContents = await fs.promises.readFile(rcFilePath, 'utf8');
  const expectedNewContents = `${ topUnmanagedContents }
${ bottomUnmanagedContents }`;

  expect(newContents).toBe(expectedNewContents);
});

test('File mode should not be changed when updating a file', async() => {
  const unmanagedContents = 'this is already present in the file\n';
  const contents = `${ unmanagedContents }
${ START_LINE }
${ TEST_LINE_1 }
${ END_LINE }`;

  await fs.promises.writeFile(rcFilePath, contents, { mode: 0o623 });
  const oldFileMode = (await fs.promises.stat(rcFilePath)).mode;

  await manageLinesInFile(rcFilePath, [], false);
  const newFileMode = (await fs.promises.stat(rcFilePath)).mode;

  expect(newFileMode).toBe(oldFileMode);
});

/* eslint-disable require-await */
test('Do nothing when desiredPresent is false and file does not exist', async() => {
  expect(async() => {
    await manageLinesInFile(rcFilePath, [TEST_LINE_1], false);
  }).not.toThrow();
});
/* eslint-enable require-await */
