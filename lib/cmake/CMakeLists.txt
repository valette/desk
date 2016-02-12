cmake_minimum_required(VERSION 2.4)

find_package(VTK)
if(VTK_FOUND)
    include(${VTK_USE_FILE})
endif(VTK_FOUND)

message(STATUS "VTKVERSION " ${VTK_MAJOR_VERSION})
