cwlVersion: v1.2
class: CommandLineTool
baseCommand: [GUI]

label: "Medical Image Annotator"
doc: |
  This tool takes an input NRRD medical image and generates segmentation mask files
  in both NIfTI (.nii) and JSON (.json) formats.

inputs:
  nrrd_file:
    type: File
    label: "Input NRRD file"
    doc: "Medical image file in NRRD format."
    inputBinding:
      position: 1

outputs:
  mask_nii:
    type: File
    label: "Segmentation mask in NIfTI format"
    outputBinding:
      glob: "mask.nii"

  mask_json:
    type: File
    label: "Segmentation mask metadata in JSON format"
    outputBinding:
      glob: "mask.json"

stdout: output.txt
