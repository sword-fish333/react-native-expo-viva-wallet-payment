import {
    ActivityIndicator,
    Alert,
    Image,
    Dimensions,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View, AppState
} from 'react-native';
import {useEffect, useRef, useState} from "react";
import {MaterialIcons} from '@expo/vector-icons';
import authAxios from "./actions/authAxios";
import {formatMessage} from "./actions/helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
    const [order_id, setOrderId] = useState(37);
    const [order_code, setOrderCode] = useState(null)
    const [waiting_payment, setWaitingPayment] = useState(false)
    const checkPaymentIntervalRef = useRef(null);

    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', async nextAppState => {
            console.log('nextAppState', nextAppState);
            if (nextAppState === 'active') {
                console.log('checkPaymentIntervalRef.current', checkPaymentIntervalRef.current);
                if (!checkPaymentIntervalRef.current) {
                    await checkPaymentCompleted();
                }
            }

        });

        return () => {
            subscription.remove();
            if (checkPaymentIntervalRef.current) {
                clearInterval(checkPaymentIntervalRef.current);
                checkPaymentIntervalRef.current = null;
            }
        };
    }, []);

    const makeVivaWalletPayment = async () => {
        try {
            const formData = new FormData();
            formData.append("total_amount", 3.59);
            const response = await authAxios.post(`viva-wallet-payment/${order_id}`, formData);
            if (!response.data.success) {
                Alert.alert('Error', response.data.message);
                return
            }
            await Linking.openURL(response.data.payment_url);
            setWaitingPayment(true)
            const order_code = response.data.order_code.toString();
            try {

                await AsyncStorage.setItem('order_code', order_code)
            } catch (e) {
                console.log('error setting order code', e)
            }
            setOrderCode(order_code)
            await checkPaymentCompleted();

        } catch (e) {
            console.log('error=>', e.response.data)
            Alert.alert('Error', formatMessage(e.response?.data?.errors));

        }
    }
    const checkPaymentCompleted = async () => {
        let order_code_req;
        if (order_code) {
            order_code_req = order_code;
        } else {
            order_code_req = await AsyncStorage.getItem('order_code')
        }
        if (!order_code_req) {
            setWaitingPayment(false)
            await clearPaymentData();

            return;
        }
        checkPaymentIntervalRef.current = setInterval(async () => {

            try {
                const response = await authAxios.post(`/viva-wallet-payment/${order_id}/check-payment`, {order_code: order_code_req})
                if (!response.data.success) {
                    await clearPaymentData();
                    Alert.alert('Error', response.data.message);
                    return;
                }
                const transaction = response.data.transaction;
                if (transaction) {
                    Alert.alert('Order completed', transaction.payment_status === 'successful' ? 'Order completed successfully' : 'Payment failed');

                    await clearPaymentData();

                }
            } catch (e) {
                console.log('Error checkPaymentCompleted cart', e.response.data);
                await clearPaymentData();

            }

        }, 2000)
        await AsyncStorage.setItem('check_payment_interval', checkPaymentIntervalRef.current)
    }

    const clearPaymentData = async () => {
      const check_payment_interval=  await AsyncStorage.getItem('check_payment_interval')
        if (check_payment_interval) {
            clearInterval(check_payment_interval);
        }
        if (checkPaymentIntervalRef.current) {
            clearInterval(checkPaymentIntervalRef.current);
            checkPaymentIntervalRef.current = null;
        }
        await AsyncStorage.removeItem('order_code')
        setWaitingPayment(false)

    }
    const cancelOrder = async () => {
        try {
            const order_code = await AsyncStorage.getItem('order_code')
            const response = await authAxios.post(`/viva-wallet-payment/${order_id}/cancel-order`, {order_code})
            if (!response.data.success) {
                Alert.alert('Error', response.data.message)
                return;
            }

            Alert.alert(response.data.message)
            setWaitingPayment(false);
            await AsyncStorage.removeItem('order_code')
            if (checkPaymentIntervalRef.current) {
                clearInterval(checkPaymentIntervalRef.current);
                checkPaymentIntervalRef.current = null;
            }

        } catch (e) {
            console.log('Error cancelOrderRequest', e.response.data)
            Alert.alert('Sorry, an error occurred.', 'Order could not be deleted. Please contact support team.')

        }
    }
    const cancelOrderRequest = () => {
        Alert.alert('Confirm Deletion', 'Are you sure you want to delete this order?', [
            {
                text: 'Cancel',
                onPress: () => console.log('Cancel Pressed'),
                style: 'cancel',
            },
            {text: 'OK', onPress: () => cancelOrder()},
        ]);
    }
    return (
        <View style={styles.container}>
            {waiting_payment ? <View style={styles.waitingPaymentContainer}>
                <Image source={require('./assets/logo.png')}
                       style={styles.logo}/>
                <ActivityIndicator
                    style={{zIndex: 100}}
                    color={'#1f243a'} size='large'/>
                <Text style={styles.waitingPaymentText}>Please finish payment first!</Text>
                <TouchableWithoutFeedback onPress={cancelOrderRequest}><View style={styles.cancelOrderBtn}><Text
                    style={styles.cancelOrderText}>Cancel Order</Text></View></TouchableWithoutFeedback>
            </View> : <View><Text style={styles.payOrderText}>Pay order: #{order_id}</Text>
                <TouchableOpacity onPress={makeVivaWalletPayment}>
                    <View style={styles.buyButton}>
                        <MaterialIcons name="payment" size={24} color="#fff"/>
                        <Text style={styles.buyText}>Viva wallet payment</Text>
                    </View>
                </TouchableOpacity></View>}
        </View>
    )
        ;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    webview: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        marginTop: 25
    },
    buyButton: {
        backgroundColor: '#1f243a',
        height: 50,
        width: Dimensions.get('window').width * .9,
        borderRadius: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: .8,
        borderColor: '#000',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,

        elevation: 5,
    },
    buyText: {
        color: '#fff',
        fontSize: 22,
        marginLeft: 12

    },
    payOrderText: {
        marginBottom: 20,
        fontSize: 22,
    },
    waitingPaymentText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 30,
        color: '#1f243a'
    },
    cancelOrderText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold'
    },
    cancelOrderBtn: {
        borderColor: '#000',
        width: 200,
        position: 'absolute',
        bottom: 50,
        height: 50,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20
    },
    waitingPaymentContainer: {
        flex: 1,
        paddingTop: 80,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingLeft: 20,
        paddingRight: 20,
    },
    logo: {
        width: '80%',
        height: Dimensions.get('window').height * 0.4,
        aspectRatio: 1,
        marginBottom: 50
    },
});
