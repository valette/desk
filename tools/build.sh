#!/bin/bash

ncores=$(grep -c ^processor /proc/cpuinfo)
cd lib

# compile ACVD
rm -rf ACVD
git clone http://github.com/valette/ACVD.git
cd ACVD
cmake . -DCMAKE_BUILD_TYPE=Release
make -j $ncores
cd ..

#compile OpenCTM
rm -rf OpenCTM
git clone http://github.com/valette/OpenCTM.git
cd OpenCTM
cmake . -DCMAKE_BUILD_TYPE=Release
make -j $ncores
cd ..

cd ..
# create links to libs
cp lib/includes/includes.json.example lib/includes/includes.json
