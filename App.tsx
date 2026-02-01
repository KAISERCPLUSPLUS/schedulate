import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { PaperProvider, Card } from "react-native-paper";

import { lightTheme, darkTheme } from "./src/theme/index";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
});

export default function App(): React.ReactElement {
    const useDarkTheme = true;
    return (
        <PaperProvider theme={useDarkTheme ? darkTheme : lightTheme}>
            <View style={styles.container}>
                <Text>Open up App.tsx to start working on your app!!</Text>
                <Card style={{ margin: 16 }}>
                    <Card.Content>
                        <Text>My first Paper component!</Text>
                    </Card.Content>
                </Card>
                <StatusBar style="auto" />
            </View>
        </PaperProvider>
    );
}
