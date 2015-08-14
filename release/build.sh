rm -rf /tmp/dilutedSearch
mkdir /tmp/dilutedSearch
cp -a ../package.json /tmp/dilutedSearch
cp -a ../README.md /tmp/dilutedSearch
cp -a ../lib       /tmp/dilutedSearch
cp -a ../data      /tmp/dilutedSearch
pushd /tmp/dilutedSearch
jpm xpi
popd
cp -a /tmp/dilutedSearch/*.xpi .
