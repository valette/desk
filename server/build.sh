#!/bin/bash

ncores=$(grep -c ^processor /proc/cpuinfo)
njobs=$((ncores+3))
cd libs

# compile ACVD
rm -rf ACVD
git clone http://github.com/valette/ACVD.git
cd ACVD
cmake . -DCMAKE_BUILD_TYPE=Release
make -j $njobs
cd ..

#compile OpenCTM
rm -rf OpenCTM
git clone http://github.com/valette/OpenCTM.git
cd OpenCTM
make -f Makefile.linux -j $njobs
cd ..

cd ..
echo 'here'
pwd
ls
# create links to libs
cp includes/includes.json.example includes/base.json
